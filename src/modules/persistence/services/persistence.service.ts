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
    PersistenceTasksWithArguments,
    TaskDto,
} from '../entities';
import { FarmPersistenceService } from './farm.persistence.service';
import { PairPersistenceService } from './pair.persistence.service';
import { StakingFarmPersistenceService } from './staking.farm.persistence.service';
import { StakingProxyPersistenceService } from './staking.proxy.persistence.service';
import { TokenPersistenceService } from './token.persistence.service';

const INDEX_LP_MAX_ATTEMPTS = 60;
const CACHE_KEY = 'dexService.persistenceTasks';

@Injectable()
export class PersistenceService {
    constructor(
        private readonly pairPersistence: PairPersistenceService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly farmPersistence: FarmPersistenceService,
        private readonly stakingFarmPersistence: StakingFarmPersistenceService,
        private readonly stakingProxyPersistence: StakingProxyPersistenceService,
        private readonly redisService: RedisCacheService,
        private readonly redLockService: RedlockService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async queueTasks(tasks: TaskDto[]): Promise<void> {
        for (const task of tasks) {
            if (
                PersistenceTasksWithArguments.includes(task.name) &&
                !task.args?.length
            ) {
                throw new Error(`Task '${task.name}' requires an argument`);
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
                case PersistenceTasks.POPULATE_FARMS:
                    await this.populateFarms();
                    break;
                case PersistenceTasks.REFRESH_FARM:
                    await this.refreshFarm(task.args[0]);
                    break;
                case PersistenceTasks.REFRESH_FARM_INFO:
                    await this.refreshFarmInfo(task.args[0]);
                    break;
                case PersistenceTasks.REFRESH_WEEK_TIMEKEEPING:
                    await this.refreshWeekTimekeeping();
                    break;
                case PersistenceTasks.POPULATE_STAKING_FARMS:
                    await this.populateStakingFarms();
                    break;
                case PersistenceTasks.REFRESH_STAKING_FARM:
                    await this.refreshStakingFarm(task.args[0]);
                    break;
                case PersistenceTasks.REFRESH_STAKING_FARM_INFO:
                    await this.refreshStakingFarmInfo(task.args[0]);
                    break;
                case PersistenceTasks.POPULATE_STAKING_PROXIES:
                    await this.populateStakingProxies();
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
        await this.populateFarms();
        await this.populateStakingFarms();
        await this.populateStakingProxies();
        await this.refreshAnalytics();
    }

    async populateFarms(): Promise<void> {
        await this.farmPersistence.populateFarms();
        await this.farmPersistence.refreshAbiFields();
        await this.farmPersistence.refreshFarmsReserves();
        await this.farmPersistence.refreshPricesAPRsAndTVL();
        await this.farmPersistence.refreshFarmsRewards();
    }

    async refreshWeekTimekeeping(): Promise<void> {
        await Promise.all([
            this.farmPersistence.refreshWeekTimekeeping(),
            this.stakingFarmPersistence.refreshWeekTimekeeping(),
        ]);
    }

    async refreshFarmInfo(address: string): Promise<void> {
        const [farm] =
            await this.farmPersistence.getFarmsWithPairAndFarmedToken({
                address,
            });

        if (!farm) {
            throw new Error(`Farm ${address} not found in db`);
        }

        await this.farmPersistence.updateAbiFields(farm);
        await this.farmPersistence.updateFarmReserves(farm);
        await this.farmPersistence.updatePricesAPRsAndTVL(farm);
        await this.farmPersistence.updateFarmRewards(farm);
    }

    async refreshFarm(address: string): Promise<void> {
        const [farm] =
            await this.farmPersistence.getFarmsWithPairAndFarmedToken({
                address,
            });

        if (!farm) {
            throw new Error(`Farm ${address} not found in db`);
        }

        await this.farmPersistence.updateFarmReserves(farm);
        await this.farmPersistence.updateFarmRewards(farm);
        await this.farmPersistence.updatePricesAPRsAndTVL(farm);
    }

    async populateStakingFarms(): Promise<void> {
        await this.stakingFarmPersistence.populateStakingFarms();
        await this.stakingFarmPersistence.refreshAbiFields();
        await this.stakingFarmPersistence.refreshReserves();
        await this.stakingFarmPersistence.refreshPricesAPRsAndTVL();
        await this.stakingFarmPersistence.refreshStakingFarmsRewards();
    }

    async refreshStakingFarmInfo(address: string): Promise<void> {
        const [stakingFarm] =
            await this.stakingFarmPersistence.getStakingFarmsWithFarmingToken({
                address,
            });

        if (!stakingFarm) {
            throw new Error(`Staking farm ${address} not found in db`);
        }

        await this.stakingFarmPersistence.updateAbiFields(stakingFarm);
        await this.stakingFarmPersistence.updateReserves(stakingFarm);
        await this.stakingFarmPersistence.updatePricesAPRsAndTVL(stakingFarm);
        await this.stakingFarmPersistence.updateStakingFarmRewards(stakingFarm);
    }

    async refreshStakingFarm(address: string): Promise<void> {
        const [stakingFarm] =
            await this.stakingFarmPersistence.getStakingFarmsWithFarmingToken({
                address,
            });

        if (!stakingFarm) {
            throw new Error(`Staking farm ${address} not found in db`);
        }

        await this.stakingFarmPersistence.updateReserves(stakingFarm);
        await this.stakingFarmPersistence.updatePricesAPRsAndTVL(stakingFarm);
        await this.stakingFarmPersistence.updateStakingFarmRewards(stakingFarm);
    }

    async populateStakingProxies(): Promise<void> {
        await this.stakingProxyPersistence.populateStakingProxies();
    }

    async refreshPairReserves(): Promise<void> {
        await this.pairPersistence.refreshPairsStateAndReserves();
        await this.pairPersistence.refreshPairsPricesAndTVL();
    }

    async refreshAnalytics(): Promise<void> {
        await this.pairPersistence.refreshPairsAnalytics();
        await this.tokenPersistence.refreshTokensAnalytics();
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
