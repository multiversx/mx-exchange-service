import {
    RedisCacheService,
    RedlockService,
} from '@multiversx/sdk-nestjs-cache';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
import { delay } from 'src/helpers/helpers';
import { Logger } from 'winston';
import { PersistenceTasks, TaskDto } from '../entities';
import { PairPersistenceService } from './pair.persistence.service';
import { TokenPersistenceService } from './token.persistence.service';

const INDEX_LP_MAX_ATTEMPTS = 60;
const CACHE_KEY = 'dexService.persistenceTasks';

@Injectable()
export class PersistenceService {
    constructor(
        private readonly pairPersistence: PairPersistenceService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly redisService: RedisCacheService,
        private readonly redLockService: RedlockService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async queueTasks(tasks: TaskDto[]): Promise<void> {
        const serializedTasks: string[] = [];

        for (const task of tasks) {
            if (
                task.name === PersistenceTasks.INDEX_LP_TOKEN &&
                !task.args?.length
            ) {
                throw new Error(
                    `Task '${task.name}' requires the pair address as an argument`,
                );
            }

            serializedTasks.push(JSON.stringify(instanceToPlain(task)));
        }

        await this.redisService.rpush(CACHE_KEY, serializedTasks);
    }

    @LockAndRetry({
        lockKey: PersistenceService.name,
        lockName: 'processQueuedTasks',
        maxLockRetries: 0,
        maxOperationRetries: 0,
    })
    async processQueuedTasks(): Promise<void> {
        const tasks = await this.redisService.lpop(CACHE_KEY);

        if (tasks.length === 0) {
            return;
        }

        const profiler = new PerformanceProfiler();

        this.logger.debug('Processing persistence tasks', {
            context: PersistenceService.name,
            tasks,
        });

        for (const rawTask of tasks) {
            const task = plainToInstance(TaskDto, JSON.parse(rawTask));

            switch (task.name) {
                case PersistenceTasks.POPULATE_DB:
                    await this.populateDb();
                    break;
                case PersistenceTasks.REFRESH_PAIR_RESERVES:
                    await this.refreshPairReserves();
                    break;
                case PersistenceTasks.INDEX_LP_TOKEN:
                    await this.indexPairLpToken(task.args[0]);
                    break;
                case PersistenceTasks.REFRESH_ANALYTICS:
                    await this.refreshAnalytics();
                    break;
                default:
                    break;
            }
        }

        profiler.stop();

        this.logger.debug(
            `Finished processing persistence tasks in ${profiler.duration}ms`,
            {
                context: PersistenceService.name,
                tasks,
            },
        );
    }

    async populateDb(): Promise<void> {
        try {
            await this.pairPersistence.populatePairs();

            await this.pairPersistence.refreshPairsPricesAndTVL();

            await this.pairPersistence.refreshPairsAbiFields();

            await this.refreshAnalytics();
        } catch (error) {
            this.logger.error('Failed populate DB task', {
                context: PersistenceService.name,
            });
            this.logger.error(error);
        }
    }

    async refreshPairReserves(): Promise<void> {
        try {
            await this.pairPersistence.refreshPairsStateAndReserves();
            await this.pairPersistence.refreshPairsPricesAndTVL();
        } catch (error) {
            this.logger.error('Failed refresh pair reserves task', {
                context: PersistenceService.name,
            });
            this.logger.error(error);
        }
    }

    async refreshAnalytics(): Promise<void> {
        await Promise.all([
            this.pairPersistence.refreshPairsAnalytics(),
            this.tokenPersistence.refreshTokensAnalytics(),
        ]);
    }

    async indexPairLpToken(address: string): Promise<void> {
        try {
            const pair = await this.pairPersistence.getPair({
                address,
            });

            let ct = 0;
            while (ct < INDEX_LP_MAX_ATTEMPTS) {
                await this.pairPersistence.updateLpToken(pair);

                if (!pair.liquidityPoolToken) {
                    await delay(1500);
                    ct++;

                    continue;
                }

                this.logger.debug(`Updated LP token`, {
                    context: PersistenceService.name,
                    address,
                    lpId: pair.liquidityPoolTokenId,
                    token: pair.liquidityPoolToken,
                });

                return;
            }

            this.logger.warn(
                `Could not update LP token after ${INDEX_LP_MAX_ATTEMPTS} attempts`,
                {
                    context: PersistenceService.name,
                    address,
                },
            );
        } catch (error) {
            this.logger.error('Failed index pair LP token task', {
                context: PersistenceService.name,
                address,
            });
            this.logger.error(error);
        }
    }
}
