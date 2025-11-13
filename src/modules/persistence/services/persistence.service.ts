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
import {
    PersistenceTaskPriority,
    PersistenceTasks,
    TaskDto,
} from '../entities';
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
        for (const task of tasks) {
            if (
                task.name === PersistenceTasks.INDEX_LP_TOKEN &&
                !task.args?.length
            ) {
                throw new Error(
                    `Task '${task.name}' requires the pair address as an argument`,
                );
            }

            const serializedTask = JSON.stringify(instanceToPlain(task));

            this.logger.info(
                `Persistence task added to queue ${serializedTask}`,
            );

            await this.redisService.zadd(
                CACHE_KEY,
                JSON.stringify(instanceToPlain(task)),
                PersistenceTaskPriority[task.name],
            );
        }
    }

    @LockAndRetry({
        lockKey: PersistenceService.name,
        lockName: 'processQueuedTasks',
        maxLockRetries: 0,
        maxOperationRetries: 1,
    })
    async processQueuedTasks(): Promise<void> {
        const rawTask = await this.redisService['redis'].zpopmin(CACHE_KEY);

        if (rawTask.length === 0) {
            return;
        }

        const profiler = new PerformanceProfiler();

        const task = plainToInstance(TaskDto, JSON.parse(rawTask[0]));

        this.logger.info(`Processing persistence task "${task.name}"`, {
            context: PersistenceService.name,
            task,
        });

        try {
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
        } catch (error) {
            this.logger.error(`Failed processing task "${task.name}"`, error);

            await this.redisService.zadd(
                CACHE_KEY,
                JSON.stringify(instanceToPlain(task)),
                PersistenceTaskPriority[task.name],
            );
        } finally {
            profiler.stop();

            this.logger.info(`Finished processing in ${profiler.duration}ms`, {
                context: PersistenceService.name,
                task,
            });
        }
    }

    async populateDb(): Promise<void> {
        await this.pairPersistence.populatePairs();
        await this.pairPersistence.refreshPairsPricesAndTVL();
        await this.pairPersistence.refreshPairsAbiFields();
        await this.refreshAnalytics();
    }

    async refreshPairReserves(): Promise<void> {
        await this.pairPersistence.refreshPairsStateAndReserves();
        await this.pairPersistence.refreshPairsPricesAndTVL();
    }

    async refreshAnalytics(): Promise<void> {
        await Promise.all([
            this.pairPersistence.refreshPairsAnalytics(),
            this.tokenPersistence.refreshTokensAnalytics(),
        ]);
    }

    async indexPairLpToken(address: string): Promise<void> {
        const [pair] = await this.pairPersistence.getPairs({
            address,
        });

        if (!pair) {
            throw new Error('Pair not found');
        }

        let ct = 0;
        while (ct < INDEX_LP_MAX_ATTEMPTS) {
            await this.pairPersistence.updateLpToken(pair);

            if (pair.liquidityPoolToken) {
                this.logger.debug(`Updated LP token`, {
                    context: PersistenceService.name,
                    address,
                    lpId: pair.liquidityPoolTokenId,
                    token: pair.liquidityPoolToken,
                });

                return;
            }

            await delay(1500);
            ct++;
        }

        const message = `Could not update pair ${address} LP token after ${INDEX_LP_MAX_ATTEMPTS} attempts`;

        throw new Error(message);
    }
}
