import { Lock } from '@multiversx/sdk-nestjs-common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { delay } from 'src/helpers/helpers';
import { Pair } from 'src/microservices/dex-state/interfaces/pairs.interfaces';
import {
    Token,
    TokenType,
} from 'src/microservices/dex-state/interfaces/tokens.interfaces';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { TokensFilter } from 'src/modules/tokens/models/tokens.filter.args';
import { CacheService } from 'src/services/caching/cache.service';
import { Logger } from 'winston';
import {
    StateTaskPriority,
    StateTasks,
    StateTasksWithArguments,
    TaskDto,
} from '../entities';
import { StateSyncService } from './state.sync.service';
import { PairsStateService } from './pairs.state.service';
import {
    reverseTokenTypeMap,
    TokensStateService,
} from './tokens.state.service';

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
                JSON.stringify(instanceToPlain(task)),
                StateTaskPriority[task.name],
            );

            this.logger.info(`State task added to queue ${serializedTask}`, {
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
            task,
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
                case StateTasks.CACHE_SNAPSHOT:
                    await this.cacheSnapshot();
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

            this.logger.info(`Finished processing in ${profiler.duration}ms`, {
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

        const pairUpdates = new Map<string, Partial<Pair>>();
        for (const pair of pairs) {
            const updates = await this.syncService.getPairAnalytics(
                pair as unknown as Pair,
            );

            pairUpdates.set(pair.address, {
                address: pair.address,
                ...updates,
            });
        }

        const tokenMap = new Map<string, Token>();
        tokensResult.tokens.forEach((token) => {
            tokenMap.set(token.identifier, {
                ...token,
                type: TokenType.TOKEN_TYPE_FUNGIBLE_TOKEN,
            } as Token);
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

    async cacheSnapshot(): Promise<void> {
        const [pairs, tokens] = await Promise.all([
            this.pairsState.getAllPairs(),
            this.tokensState.getAllTokens(),
        ]);

        const convertedTokens: Token[] = tokens.map((token) => ({
            ...token,
            type: reverseTokenTypeMap[token.type],
        }));

        await this.syncService.cacheSnapshot(pairs, convertedTokens);
    }
}
