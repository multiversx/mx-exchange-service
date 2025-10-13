import {
    RedisCacheService,
    RedlockService,
} from '@multiversx/sdk-nestjs-cache';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
import { delay } from 'src/helpers/helpers';
import { Logger } from 'winston';
import { PairPersistenceService } from './pair.persistence.service';
import { TokenPersistenceService } from './token.persistence.service';

export enum PopulateStatus {
    NOT_STARTED = 'Not Started',
    IN_PROGRESS = 'In Progress',
    SUCCESSFUL = 'Successful',
    FAILED = 'Failed',
}

export enum PersistenceTasks {
    POPULATE_DB = 'populateDb',
    REFRESH_PAIR_RESERVES = 'refreshReserves',
    INDEX_LP_TOKEN = 'indexLpToken',
    REFRESH_ANALYTICS = 'refreshAnalytics',
}

export type Task = {
    name: PersistenceTasks;
    args?: string[];
};

const INDEX_LP_MAX_ATTEMPTS = 60;

@Injectable()
export class PersistenceInitService {
    private status: PopulateStatus = PopulateStatus.NOT_STARTED;

    constructor(
        private readonly pairPersistence: PairPersistenceService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly redisService: RedisCacheService,
        private readonly redLockService: RedlockService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async queueTask(task: Task): Promise<void> {
        if (
            task.name === PersistenceTasks.INDEX_LP_TOKEN &&
            !task.args?.length
        ) {
            throw new Error(
                `Task ${task.name} requires the pair address as an argument`,
            );
        }

        await this.redisService.rpush('persistenceTasks', [
            JSON.stringify(task),
        ]);
    }

    @LockAndRetry({
        lockKey: PersistenceInitService.name,
        lockName: 'processQueuedTasks',
        maxLockRetries: 1,
        maxOperationRetries: 1,
    })
    async processQueuedTasks(): Promise<void> {
        const tasks = await this.redisService.lpop('persistenceTasks');

        if (tasks.length === 0) {
            return;
        }

        this.logger.debug('Processing tasks', {
            context: PersistenceInitService.name,
            tasks,
        });

        for (const rawTask of tasks) {
            const task: Task = JSON.parse(rawTask);

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
    }

    async populateDb(): Promise<void> {
        try {
            await this.pairPersistence.populatePairs();

            await this.pairPersistence.refreshPairsPricesAndTVL();

            // TODO : set ready flag in mongo to activate state changes consumer

            await this.pairPersistence.refreshPairsAbiFields();

            await this.refreshAnalytics();
        } catch (error) {
            this.logger.error('Failed during populateDb', {
                context: PersistenceInitService.name,
            });
            this.logger.error(error);
        }
    }

    async refreshPairReserves(): Promise<void> {
        try {
            await this.pairPersistence.refreshPairsStateAndReserves();
            await this.pairPersistence.refreshPairsPricesAndTVL();
        } catch (error) {
            this.logger.error('Failed pair reserves refresh', {
                context: PersistenceInitService.name,
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

                console.log({
                    id: pair.liquidityPoolTokenId,
                    token: pair.liquidityPoolToken,
                });

                return;
            }
        } catch (error) {
            this.logger.error('Failed index pair LP token', {
                context: PersistenceInitService.name,
                address,
            });
            this.logger.error(error);
        }
    }

    getStatus(): PopulateStatus {
        return this.status;
    }
}
