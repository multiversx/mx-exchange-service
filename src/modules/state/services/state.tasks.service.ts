import { Lock } from '@multiversx/sdk-nestjs-common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { delay } from 'src/helpers/helpers';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { TokensFilter } from 'src/modules/tokens/models/tokens.filter.args';
import { CacheService } from 'src/services/caching/cache.service';
import { Logger } from 'winston';
import { StateSyncService } from './state.sync.service';
import { PairsStateService } from './pairs.state.service';
import { TokensStateService } from './tokens.state.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { FarmsStateService } from './farms.state.service';
import { FeesCollectorStateService } from './fees.collector.state.service';
import { StateService } from './state.service';
import { StakingStateService } from './staking.state.service';
import {
    PENDING_PRICE_UPDATES_KEY,
    StateTaskPriority,
    StateTasks,
    StateTasksWithArguments,
    TaskDto,
    TOKENS_PRICE_UPDATE_EVENT,
} from '../entities/state.tasks.entities';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';

export const STATE_TASKS_CACHE_KEY = 'dexService.stateTasks';
const TASK_RETRY_COUNT_KEY_PREFIX = 'dexService.taskRetryCount';
const MAX_TASK_RETRIES = 5;
const TASK_RETRY_TTL_SECONDS = 86400;
const INDEX_LP_MAX_ATTEMPTS = 60;
const PAIR_REFRESH_CONCURRENCY = 50;
const TOKEN_REFRESH_CONCURRENCY = 50;

function getTaskRetryKey(task: TaskDto): string {
    const base = `${TASK_RETRY_COUNT_KEY_PREFIX}:${task.name}`;
    return task.args?.length ? `${base}:${task.args.join(':')}` : base;
}

@Injectable()
export class StateTasksService {
    constructor(
        private readonly syncService: StateSyncService,
        private readonly cacheService: CacheService,
        private readonly stateService: StateService,
        @Inject(forwardRef(() => PairsStateService))
        private readonly pairsState: PairsStateService,
        @Inject(forwardRef(() => TokensStateService))
        private readonly tokensState: TokensStateService,
        private readonly farmsState: FarmsStateService,
        private readonly stakingState: StakingStateService,
        private readonly feesCollectorState: FeesCollectorStateService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async queueTasks(tasks: TaskDto[]): Promise<void> {
        for (const task of tasks) {
            if (
                StateTasksWithArguments.includes(task.name) &&
                !task.args?.length
            ) {
                throw new Error(`Task '${task.name}' requires an argument`);
            }

            if (task.name === StateTasks.BROADCAST_PRICE_UPDATES) {
                if (task.args?.length) {
                    const tokenIDs = JSON.parse(task.args[0]) as string[];
                    await this.cacheService.addToSet(
                        PENDING_PRICE_UPDATES_KEY,
                        tokenIDs,
                    );
                }

                await this.cacheService.zAdd(
                    STATE_TASKS_CACHE_KEY,
                    JSON.stringify({ name: StateTasks.BROADCAST_PRICE_UPDATES }),
                    StateTaskPriority[task.name],
                );

                this.logger.info(
                    `State task ${task.name} added to queue`,
                    { context: StateTasksService.name },
                );
                continue;
            }

            const serializedTask = JSON.stringify(instanceToPlain(task));

            await this.cacheService.zAdd(
                STATE_TASKS_CACHE_KEY,
                serializedTask,
                StateTaskPriority[task.name],
            );

            this.logger.info(`State task ${task.name} added to queue`, {
                context: StateTasksService.name,
            });
            this.logger.debug(`Serialized task : ${serializedTask}`, {
                context: StateTasksService.name,
            });
        }
    }

    @Lock({ name: 'processQueuedTasks', verbose: false })
    async processQueuedTasks(): Promise<void> {
        const rawTask = await this.cacheService.zPopMin(STATE_TASKS_CACHE_KEY);

        if (rawTask.length === 0) {
            return;
        }

        const profiler = new PerformanceProfiler();

        const task = plainToInstance(TaskDto, JSON.parse(rawTask[0]));

        this.logger.info(`Processing state task "${task.name}"`, {
            context: StateTasksService.name,
        });

        try {
            switch (task.name) {
                case StateTasks.INIT_STATE:
                    await this.populateState();
                    break;
                case StateTasks.INDEX_PAIR:
                    await this.indexPair(
                        JSON.parse(task.args[0]),
                        parseInt(task.args[1]),
                    );
                    break;
                case StateTasks.INDEX_LP_TOKEN:
                    await this.indexPairLpToken(task.args[0]);
                    break;
                case StateTasks.REFRESH_ANALYTICS:
                    await this.refreshAnalytics();
                    break;
                case StateTasks.UPDATE_SNAPSHOT:
                    await this.updateSnapshot();
                    break;
                case StateTasks.BROADCAST_PRICE_UPDATES:
                    await this.broadcastTokensPriceUpdates();
                    break;
                case StateTasks.REFRESH_PAIR_RESERVES:
                    await this.refreshPairReserves();
                    break;
                case StateTasks.REFRESH_USDC_PRICE:
                    await this.refreshUsdcPrice();
                    break;
                case StateTasks.REFRESH_FARMS:
                    await this.refreshFarms();
                    break;
                case StateTasks.REFRESH_FARM:
                    await this.refreshFarm(task.args[0]);
                    break;
                case StateTasks.REFRESH_STAKING_FARMS:
                    await this.refreshStakingFarms();
                    break;
                case StateTasks.REFRESH_STAKING_FARM:
                    await this.refreshStakingFarm(task.args[0]);
                    break;
                case StateTasks.REFRESH_FEES_COLLECTOR:
                    await this.refreshFeesCollector();
                    break;
                case StateTasks.REFRESH_TOKEN:
                    await this.refreshToken(task.args[0]);
                    break;
                case StateTasks.REFRESH_TOKENS:
                    await this.refreshTokens();
                    break;
                default:
                    break;
            }

            await this.cacheService.deleteRemote(getTaskRetryKey(task));
        } catch (error) {
            this.logger.error(`Failed processing task "${task.name}"`, error);

            const retryCount = await this.cacheService.incrementRemote(
                getTaskRetryKey(task),
                TASK_RETRY_TTL_SECONDS,
            );

            if (retryCount >= MAX_TASK_RETRIES) {
                this.logger.error(
                    `Task "${task.name}" dead-lettered after ${MAX_TASK_RETRIES} failed attempts`,
                    { task: instanceToPlain(task), context: StateTasksService.name },
                );
                await this.cacheService.deleteRemote(getTaskRetryKey(task));
            } else {
                this.logger.warn(
                    `Re-queuing task "${task.name}" (attempt ${retryCount}/${MAX_TASK_RETRIES})`,
                    { context: StateTasksService.name },
                );
                await this.cacheService.zAdd(
                    STATE_TASKS_CACHE_KEY,
                    JSON.stringify(instanceToPlain(task)),
                    StateTaskPriority[task.name],
                );
            }
        } finally {
            profiler.stop(`Finished processing task "${task.name}" in`, true);
        }
    }

    async populateState(): Promise<void> {
        const request = await this.syncService.populateState();

        const response = await this.stateService.initState(request);

        this.logger.info(`Populate state task completed`, {
            context: StateTasksService.name,
            response,
        });

        await this.queueTasks([
            new TaskDto({
                name: StateTasks.REFRESH_PAIR_RESERVES,
                args: [],
            }),
        ]);
    }

    async indexPair(
        pairMetadata: PairMetadata,
        timestamp: number,
    ): Promise<void> {
        const { pair, firstToken, secondToken } =
            await this.syncService.populatePairAndTokens(
                pairMetadata,
                timestamp,
            );

        await this.pairsState.addPair(pair, firstToken, secondToken);
    }

    async indexPairLpToken(address: string): Promise<void> {
        const [pair] = await this.pairsState.getPairs([address], ['address']);

        if (!pair) {
            throw new Error('Pair not found');
        }

        let ct = 0;
        while (ct < INDEX_LP_MAX_ATTEMPTS) {
            const lpToken = await this.syncService.indexPairLpToken(
                pair.address,
            );

            if (lpToken) {
                await this.pairsState.addPairLpToken(address, lpToken);

                this.logger.debug(`Updated LP token`, {
                    context: StateTasksService.name,
                    address,
                    lpToken,
                });
                return;
            }

            await delay(1500);
            ct++;
        }

        const message = `Could not update pair ${address} LP token after ${INDEX_LP_MAX_ATTEMPTS} attempts`;

        throw new Error(message);
    }

    async refreshAnalytics(): Promise<void> {
        const [pairs, tokensResult] = await Promise.all([
            this.pairsState.getAllPairs([
                'address',
                'totalFeePercent',
                'specialFeePercent',
                'lockedValueUSD',
            ]),
            this.tokensState.getFilteredTokens(
                0,
                10000,
                new TokensFilter(),
                undefined,
                [
                    'identifier',
                    'derivedEGLD',
                    'price',
                    'previous24hPrice',
                    'type',
                ],
            ),
        ]);

        const pairUpdates = new Map<string, Partial<PairModel>>();
        for (const pair of pairs) {
            const updates = await this.syncService.getPairAnalytics(pair);

            pairUpdates.set(pair.address, {
                address: pair.address,
                ...updates,
            });
        }

        const tokenMap = new Map<string, EsdtToken>();
        tokensResult.tokens.forEach((token) => {
            tokenMap.set(token.identifier, {
                ...token,
            });
        });

        await this.syncService.updateTokensAnalytics(tokenMap, [
            ...tokenMap.keys(),
        ]);

        tokenMap.forEach((token) => {
            delete token.price;
            delete token.derivedEGLD;
            delete token.type;
        });

        const pairsUpdateResult = await this.pairsState.updatePairs(
            pairUpdates,
        );
        const tokensUpdateResult = await this.tokensState.updateTokens(
            tokenMap,
        );

        this.logger.debug(`Refresh analytics task completed`, {
            context: StateTasksService.name,
            pairsUpdateResult,
            tokensUpdateResult,
        });
    }

    async updateSnapshot(): Promise<void> {
        const [
            pairs,
            tokens,
            farms,
            stakingFarms,
            stakingProxies,
            feesCollector,
        ] = await Promise.all([
            this.pairsState.getAllPairs(),
            this.tokensState.getAllTokens(),
            this.farmsState.getAllFarms(),
            this.stakingState.getAllStakingFarms(),
            this.stakingState.getAllStakingProxies(),
            this.feesCollectorState.getFeesCollector(),
        ]);

        const updateResult = await this.syncService.updateSnapshot(
            pairs,
            tokens,
            farms,
            stakingFarms,
            stakingProxies,
            feesCollector,
        );

        this.logger.debug(`Update snapshot task completed`, {
            context: StateTasksService.name,
            updateResult,
        });
    }

    async broadcastTokensPriceUpdates(): Promise<void> {
        const tokenIDs = await this.cacheService.getSetMembers(
            PENDING_PRICE_UPDATES_KEY,
        );

        if (tokenIDs.length === 0) {
            return;
        }

        await this.cacheService.deleteRemote(PENDING_PRICE_UPDATES_KEY);

        const tokens = await this.tokensState.getTokens(tokenIDs, [
            'identifier',
            'price',
        ]);

        const priceByID = new Map(tokens.map((t) => [t.identifier, t.price]));

        const priceUpdates: string[][] = tokenIDs
            .filter((id) => priceByID.has(id))
            .map((id) => [id, priceByID.get(id)]);

        await this.pubSub.publish(TOKENS_PRICE_UPDATE_EVENT, {
            priceUpdates,
        });
    }

    async refreshPairReserves(): Promise<void> {
        const pairs = await this.pairsState.getAllPairs(['address']);

        const pairUpdates = new Map<string, Partial<PairModel>>();

        const profiler = new PerformanceProfiler();

        // Process pairs in chunks to parallelize blockchain queries
        for (let i = 0; i < pairs.length; i += PAIR_REFRESH_CONCURRENCY) {
            const chunk = pairs.slice(i, i + PAIR_REFRESH_CONCURRENCY);
            const results = await Promise.all(
                chunk.map((pair) =>
                    this.syncService.getPairReservesAndState(pair),
                ),
            );
            results.forEach((updates, idx) => {
                pairUpdates.set(chunk[idx].address, {
                    ...updates,
                });
            });
        }

        profiler.stop('Finished syncing pairs reserves in', true);

        const updateResult = await this.pairsState.updatePairs(pairUpdates);

        this.logger.debug(`Refresh pairs reserves and state task completed`, {
            context: StateTasksService.name,
            updateResult,
        });
    }

    async refreshUsdcPrice(): Promise<void> {
        const usdcPrice = await this.syncService.getUsdcPrice();

        const updateResult = await this.stateService.updateUsdcPrice(usdcPrice);

        this.logger.debug(`Refresh USDC price task completed`, {
            context: StateTasksService.name,
            updateResult,
        });
    }

    async refreshFarms(): Promise<void> {
        const farms = await this.farmsState.getAllFarms(['address']);

        const farmUpdates = new Map<string, Partial<FarmModelV2>>();
        for (const farm of farms) {
            const updates =
                await this.syncService.getFarmReservesAndWeeklyRewards(farm);

            farmUpdates.set(farm.address, {
                ...updates,
            });
        }

        const updateResult = await this.farmsState.updateFarms(farmUpdates);

        this.logger.debug(`Refresh farms task completed`, {
            context: StateTasksService.name,
            updateResult,
        });
    }

    async refreshFarm(address: string): Promise<void> {
        const [farm] = await this.farmsState.getFarms([address], ['address']);

        if (!farm) {
            throw new Error(`Farm ${address} not found`);
        }

        const farmUpdates = new Map<string, Partial<FarmModelV2>>();

        const updates = await this.syncService.getFarmReservesAndWeeklyRewards(
            farm,
        );

        farmUpdates.set(address, { ...updates });

        const updateResult = await this.farmsState.updateFarms(farmUpdates);

        this.logger.debug(`Refresh farm ${address} task completed`, {
            context: StateTasksService.name,
            updateResult,
        });
    }

    async refreshStakingFarms(): Promise<void> {
        const stakingFarms = await this.stakingState.getAllStakingFarms([
            'address',
        ]);

        const stakingFarmUpdates = new Map<string, Partial<StakingModel>>();
        for (const stakingFarm of stakingFarms) {
            const updates =
                await this.syncService.getStakingFarmReservesAndWeeklyRewards(
                    stakingFarm,
                );

            stakingFarmUpdates.set(stakingFarm.address, {
                ...updates,
            });
        }

        const updateResult = await this.stakingState.updateStakingFarms(
            stakingFarmUpdates,
        );

        this.logger.debug(`Refresh staking farms task completed`, {
            context: StateTasksService.name,
            updateResult,
        });
    }

    async refreshStakingFarm(address: string): Promise<void> {
        const [stakingFarm] = await this.stakingState.getStakingFarms(
            [address],
            ['address'],
        );

        if (!stakingFarm) {
            throw new Error(`Staking farm ${address} not found`);
        }

        const stakingFarmUpdates = new Map<string, Partial<StakingModel>>();

        const updates =
            await this.syncService.getStakingFarmReservesAndWeeklyRewards(
                stakingFarm,
            );

        stakingFarmUpdates.set(address, {
            ...updates,
        });

        const updateResult = await this.stakingState.updateStakingFarms(
            stakingFarmUpdates,
        );

        this.logger.debug(`Refresh staking farm ${address} task completed`, {
            context: StateTasksService.name,
            updateResult,
        });
    }

    async refreshFeesCollector(): Promise<void> {
        const feesCollector = await this.feesCollectorState.getFeesCollector([
            'address',
            'allTokens',
            'lockedTokenId',
            'lockedTokensPerEpoch',
        ]);

        const feesCollectorUpdates =
            await this.syncService.getFeesCollectorFeesAndWeeklyRewards(
                feesCollector,
            );

        await this.feesCollectorState.updateFeesCollector(feesCollectorUpdates);
    }

    async refreshToken(identifier: string): Promise<void> {
        const updates = await this.syncService.refreshTokenMetadata(identifier);

        if (!updates) {
            throw new Error(`Token ${identifier} not found`);
        }

        const tokenUpdates = new Map<string, Partial<EsdtToken>>();
        tokenUpdates.set(identifier, updates);

        const updateResult = await this.tokensState.updateTokens(tokenUpdates);

        this.logger.debug(`Refresh token ${identifier} task completed`, {
            context: StateTasksService.name,
            updateResult,
        });
    }

    async refreshTokens(): Promise<void> {
        const tokens = await this.tokensState.getAllTokens(['identifier']);

        const tokenUpdates = new Map<string, Partial<EsdtToken>>();

        const profiler = new PerformanceProfiler();

        for (let i = 0; i < tokens.length; i += TOKEN_REFRESH_CONCURRENCY) {
            const chunk = tokens.slice(i, i + TOKEN_REFRESH_CONCURRENCY);
            const results = await Promise.all(
                chunk.map((token) =>
                    this.syncService.refreshTokenMetadata(token.identifier),
                ),
            );
            results.forEach((updates, idx) => {
                if (updates) {
                    tokenUpdates.set(chunk[idx].identifier, updates);
                }
            });
        }

        profiler.stop('Finished syncing tokens metadata in', true);

        const updateResult = await this.tokensState.updateTokens(tokenUpdates);

        this.logger.debug(`Refresh all tokens metadata task completed`, {
            context: StateTasksService.name,
            updateResult,
        });
    }
}
