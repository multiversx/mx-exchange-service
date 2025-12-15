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
import {
    StateTaskPriority,
    StateTasks,
    StateTasksWithArguments,
    TaskDto,
    TOKENS_PRICE_UPDATE_EVENT,
} from '../entities';
import { StateSyncService } from './state.sync.service';
import { PairsStateService } from './pairs.state.service';
import { TokensStateService } from './tokens.state.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';

export const STATE_TASKS_CACHE_KEY = 'dexService.stateTasks';
const INDEX_LP_MAX_ATTEMPTS = 60;

@Injectable()
export class StateTasksService {
    constructor(
        private readonly syncService: StateSyncService,
        private readonly cacheService: CacheService,
        private readonly pairsState: PairsStateService,
        @Inject(forwardRef(() => TokensStateService))
        private readonly tokensState: TokensStateService,
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
                case StateTasks.ADD_PAIR:
                    await this.addPair(
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
                    await this.broadcastTokensPriceUpdates(
                        JSON.parse(task.args[0]),
                    );
                    break;
                // case PersistenceTasks.REFRESH_PAIR_RESERVES:
                //     await this.refreshPairReserves();
                //     break;
                // case PersistenceTasks.POPULATE_FARMS:
                //     await this.populateFarms();
                //     break;
                // case PersistenceTasks.REFRESH_FARM:
                //     await this.refreshFarm(task.args[0]);
                //     break;
                // case PersistenceTasks.REFRESH_FARM_INFO:
                //     await this.refreshFarmInfo(task.args[0]);
                //     break;
                // case PersistenceTasks.REFRESH_WEEK_TIMEKEEPING:
                //     await this.refreshWeekTimekeeping();
                //     break;
                // case PersistenceTasks.POPULATE_STAKING_FARMS:
                //     await this.populateStakingFarms();
                //     break;
                // case PersistenceTasks.REFRESH_STAKING_FARM:
                //     await this.refreshStakingFarm(task.args[0]);
                //     break;
                // case PersistenceTasks.REFRESH_STAKING_FARM_INFO:
                //     await this.refreshStakingFarmInfo(task.args[0]);
                //     break;
                // case PersistenceTasks.POPULATE_STAKING_PROXIES:
                //     await this.populateStakingProxies();
                //     break;
                default:
                    break;
            }
        } catch (error) {
            this.logger.error(`Failed processing task "${task.name}"`, error);

            await this.cacheService.zAdd(
                STATE_TASKS_CACHE_KEY,
                JSON.stringify(instanceToPlain(task)),
                StateTaskPriority[task.name],
            );
        } finally {
            profiler.stop();

            this.logger.info(
                `Finished processing task "${task.name}" in ${profiler.duration}ms`,
                {
                    context: StateTasksService.name,
                },
            );
            this.logger.debug(`Processed task`, {
                context: StateTasksService.name,
                task,
            });
        }
    }

    async populateState(): Promise<void> {
        const { tokens, pairs, commonTokenIDs, usdcPrice } =
            await this.syncService.populateState();

        await this.pairsState.initState(
            tokens,
            pairs,
            commonTokenIDs,
            usdcPrice,
        );
    }

    async addPair(
        pairMetadata: PairMetadata,
        timestamp: number,
    ): Promise<void> {
        const { pair, firstToken, secondToken } =
            await this.syncService.addPair(pairMetadata, timestamp);

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
        const [pairs, tokens] = await Promise.all([
            this.pairsState.getAllPairs(),
            this.tokensState.getAllTokens(),
        ]);

        const updateResult = await this.syncService.updateSnapshot(
            pairs,
            tokens,
        );

        this.logger.debug(`Update snapshot task completed`, {
            context: StateTasksService.name,
            updateResult,
        });
    }

    async broadcastTokensPriceUpdates(tokenIDs: string[]): Promise<void> {
        const priceUpdates: string[][] = [];
        const tokens = await this.tokensState.getTokens(tokenIDs, ['price']);

        tokenIDs.forEach((tokenID, index) =>
            priceUpdates.push([tokenID, tokens[index].price]),
        );

        await this.pubSub.publish(TOKENS_PRICE_UPDATE_EVENT, {
            priceUpdates,
        });
    }
}
