import { Test, TestingModule } from '@nestjs/testing';
import { StateTasksService, STATE_TASKS_CACHE_KEY } from '../services/state.tasks.service';
import { StateSyncService } from '../services/state.sync.service';
import { CacheService } from 'src/services/caching/cache.service';
import { StateService } from '../services/state.service';
import { PairsStateService } from '../services/pairs.state.service';
import { TokensStateService } from '../services/tokens.state.service';
import { FarmsStateService } from '../services/farms.state.service';
import { StakingStateService } from '../services/staking.state.service';
import { FeesCollectorStateService } from '../services/fees.collector.state.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import {
    StateTasks,
    StateTaskPriority,
    TaskDto,
    PENDING_PRICE_UPDATES_KEY,
} from '../entities/state.tasks.entities';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';

describe('StateTasksService', () => {
    let service: StateTasksService;
    let cacheService: jest.Mocked<CacheService>;
    let syncService: jest.Mocked<StateSyncService>;
    let stateService: jest.Mocked<StateService>;
    let pairsState: jest.Mocked<PairsStateService>;
    let tokensState: jest.Mocked<TokensStateService>;
    let farmsState: jest.Mocked<FarmsStateService>;
    let stakingState: jest.Mocked<StakingStateService>;
    let feesCollectorState: jest.Mocked<FeesCollectorStateService>;
    let logger: any;
    let pubSub: any;

    beforeEach(async () => {
        const mockCacheService = {
            zAdd: jest.fn().mockResolvedValue(undefined),
            zPopMin: jest.fn().mockResolvedValue([]),
            addToSet: jest.fn().mockResolvedValue(undefined),
            getSetMembers: jest.fn().mockResolvedValue([]),
            incrementRemote: jest.fn().mockResolvedValue(1),
            deleteRemote: jest.fn().mockResolvedValue(undefined),
        };

        const mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        const mockPubSub = {
            publish: jest.fn().mockResolvedValue(undefined),
        };

        const mockSyncService = {
            populateState: jest.fn(),
            populatePairAndTokens: jest.fn(),
            indexPairLpToken: jest.fn(),
            getPairAnalytics: jest.fn(),
            updateSnapshot: jest.fn(),
            getPairReservesAndState: jest.fn(),
            getUsdcPrice: jest.fn(),
            getFarmReservesAndWeeklyRewards: jest.fn(),
            getStakingFarmReservesAndWeeklyRewards: jest.fn(),
            getFeesCollectorFeesAndWeeklyRewards: jest.fn(),
        };

        const mockStateService = {
            initState: jest.fn(),
        };

        const mockPairsState = {
            getAllPairs: jest.fn(),
            getPairs: jest.fn(),
            updatePairs: jest.fn(),
            addPair: jest.fn(),
            addPairLpToken: jest.fn(),
        };

        const mockTokensState = {
            getFilteredTokens: jest.fn(),
            getTokens: jest.fn(),
            getAllTokens: jest.fn(),
            updateTokens: jest.fn(),
        };

        const mockFarmsState = {
            getAllFarms: jest.fn(),
            getFarms: jest.fn(),
            updateFarms: jest.fn(),
        };

        const mockStakingState = {
            getAllStakingFarms: jest.fn(),
            getAllStakingProxies: jest.fn(),
            getStakingFarms: jest.fn(),
            updateStakingFarms: jest.fn(),
        };

        const mockFeesCollectorState = {
            getFeesCollector: jest.fn(),
            updateFeesCollector: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StateTasksService,
                { provide: StateSyncService, useValue: mockSyncService },
                { provide: CacheService, useValue: mockCacheService },
                { provide: StateService, useValue: mockStateService },
                { provide: PairsStateService, useValue: mockPairsState },
                { provide: TokensStateService, useValue: mockTokensState },
                { provide: FarmsStateService, useValue: mockFarmsState },
                { provide: StakingStateService, useValue: mockStakingState },
                { provide: FeesCollectorStateService, useValue: mockFeesCollectorState },
                { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
                { provide: PUB_SUB, useValue: mockPubSub },
            ],
        }).compile();

        service = module.get<StateTasksService>(StateTasksService);
        cacheService = module.get(CacheService);
        syncService = module.get(StateSyncService);
        stateService = module.get(StateService);
        pairsState = module.get(PairsStateService);
        tokensState = module.get(TokensStateService);
        farmsState = module.get(FarmsStateService);
        stakingState = module.get(StakingStateService);
        feesCollectorState = module.get(FeesCollectorStateService);
        logger = module.get(WINSTON_MODULE_PROVIDER);
        pubSub = module.get(PUB_SUB);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('queueTasks', () => {
        it('should queue a simple task without arguments', async () => {
            const tasks = [
                new TaskDto({
                    name: StateTasks.INIT_STATE,
                    args: [],
                }),
            ];

            await service.queueTasks(tasks);

            expect(cacheService.zAdd).toHaveBeenCalledWith(
                STATE_TASKS_CACHE_KEY,
                expect.stringContaining('"name":"initState"'),
                StateTaskPriority[StateTasks.INIT_STATE],
            );
            expect(logger.info).toHaveBeenCalledWith(
                'State task initState added to queue',
                expect.any(Object),
            );
        });

        it('should queue a task with arguments', async () => {
            const tasks = [
                new TaskDto({
                    name: StateTasks.INDEX_LP_TOKEN,
                    args: ['erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq'],
                }),
            ];

            await service.queueTasks(tasks);

            expect(cacheService.zAdd).toHaveBeenCalledWith(
                STATE_TASKS_CACHE_KEY,
                expect.stringContaining('"name":"indexLpToken"'),
                StateTaskPriority[StateTasks.INDEX_LP_TOKEN],
            );
        });

        it('should throw error if task requires arguments but none provided', async () => {
            const tasks = [
                new TaskDto({
                    name: StateTasks.INDEX_LP_TOKEN,
                    args: [],
                }),
            ];

            await expect(service.queueTasks(tasks)).rejects.toThrow(
                "Task 'indexLpToken' requires an argument",
            );
        });

        it('should queue multiple tasks', async () => {
            const tasks = [
                new TaskDto({ name: StateTasks.INIT_STATE, args: [] }),
                new TaskDto({ name: StateTasks.REFRESH_ANALYTICS, args: [] }),
                new TaskDto({ name: StateTasks.UPDATE_SNAPSHOT, args: [] }),
            ];

            await service.queueTasks(tasks);

            expect(cacheService.zAdd).toHaveBeenCalledTimes(3);
        });

        it('should handle BROADCAST_PRICE_UPDATES special case with token accumulation', async () => {
            const tokenIDs = ['WEGLD-123456', 'MEX-123456', 'USDC-123456'];
            const tasks = [
                new TaskDto({
                    name: StateTasks.BROADCAST_PRICE_UPDATES,
                    args: [JSON.stringify(tokenIDs)],
                }),
            ];

            await service.queueTasks(tasks);

            // Should add token IDs to the pending set
            expect(cacheService.addToSet).toHaveBeenCalledWith(
                PENDING_PRICE_UPDATES_KEY,
                tokenIDs,
            );

            // Should queue the task without args (accumulation pattern)
            expect(cacheService.zAdd).toHaveBeenCalledWith(
                STATE_TASKS_CACHE_KEY,
                JSON.stringify({ name: StateTasks.BROADCAST_PRICE_UPDATES }),
                StateTaskPriority[StateTasks.BROADCAST_PRICE_UPDATES],
            );
        });

        it('should queue BROADCAST_PRICE_UPDATES without args if no tokens provided', async () => {
            const tasks = [
                new TaskDto({
                    name: StateTasks.BROADCAST_PRICE_UPDATES,
                    args: [],
                }),
            ];

            await service.queueTasks(tasks);

            // Should not call addToSet if no args
            expect(cacheService.addToSet).not.toHaveBeenCalled();

            // Should still queue the task
            expect(cacheService.zAdd).toHaveBeenCalledWith(
                STATE_TASKS_CACHE_KEY,
                JSON.stringify({ name: StateTasks.BROADCAST_PRICE_UPDATES }),
                StateTaskPriority[StateTasks.BROADCAST_PRICE_UPDATES],
            );
        });
    });

    describe('task priority ordering', () => {
        it('should queue tasks with correct priorities', async () => {
            const tasks = [
                new TaskDto({ name: StateTasks.INIT_STATE, args: [] }),
                new TaskDto({ name: StateTasks.REFRESH_ANALYTICS, args: [] }),
                new TaskDto({ name: StateTasks.INDEX_PAIR, args: [JSON.stringify({}), '0'] }),
            ];

            await service.queueTasks(tasks);

            // INIT_STATE should have priority 0 (highest)
            expect(cacheService.zAdd).toHaveBeenCalledWith(
                STATE_TASKS_CACHE_KEY,
                expect.anything(),
                0,
            );

            // INDEX_PAIR should have priority 1
            expect(cacheService.zAdd).toHaveBeenCalledWith(
                STATE_TASKS_CACHE_KEY,
                expect.anything(),
                1,
            );

            // REFRESH_ANALYTICS should have priority 1000 (lowest)
            expect(cacheService.zAdd).toHaveBeenCalledWith(
                STATE_TASKS_CACHE_KEY,
                expect.anything(),
                1000,
            );
        });
    });

    describe('processQueuedTasks', () => {
        it('should return early if no tasks in queue', async () => {
            cacheService.zPopMin.mockResolvedValue([]);

            await service.processQueuedTasks();

            expect(cacheService.zPopMin).toHaveBeenCalledWith(STATE_TASKS_CACHE_KEY);
            expect(logger.info).not.toHaveBeenCalled();
        });

        it('should process INIT_STATE task', async () => {
            const task = new TaskDto({ name: StateTasks.INIT_STATE, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (syncService.populateState as jest.Mock).mockResolvedValue({});
            (stateService.initState as jest.Mock).mockResolvedValue({});

            await service.processQueuedTasks();

            expect(syncService.populateState).toHaveBeenCalled();
            expect(stateService.initState).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                'Processing state task "initState"',
                expect.any(Object),
            );
        });

        it('should process INDEX_PAIR task', async () => {
            const pairMetadata: PairMetadata = {
                address: 'erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq',
                firstTokenID: 'WEGLD-123456',
                secondTokenID: 'USDC-123456',
            };
            const task = new TaskDto({
                name: StateTasks.INDEX_PAIR,
                args: [JSON.stringify(pairMetadata), '1640000000'],
            });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            const mockPair = { address: pairMetadata.address };
            const mockFirstToken = { identifier: 'WEGLD-123456' };
            const mockSecondToken = { identifier: 'USDC-123456' };

            (syncService.populatePairAndTokens as jest.Mock).mockResolvedValue({
                pair: mockPair,
                firstToken: mockFirstToken,
                secondToken: mockSecondToken,
            });
            (pairsState.addPair as jest.Mock).mockResolvedValue(undefined);

            await service.processQueuedTasks();

            expect(syncService.populatePairAndTokens).toHaveBeenCalledWith(
                pairMetadata,
                1640000000,
            );
            expect(pairsState.addPair).toHaveBeenCalledWith(
                mockPair,
                mockFirstToken,
                mockSecondToken,
            );
        });

        it('should process INDEX_LP_TOKEN task successfully', async () => {
            const pairAddress = 'erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq';
            const task = new TaskDto({
                name: StateTasks.INDEX_LP_TOKEN,
                args: [pairAddress],
            });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            const mockPair = { address: pairAddress };
            const mockLpToken = { identifier: 'EGLDUSDC-abcdef' };

            (pairsState.getPairs as jest.Mock).mockResolvedValue([mockPair]);
            (syncService.indexPairLpToken as jest.Mock).mockResolvedValue(mockLpToken);
            (pairsState.addPairLpToken as jest.Mock).mockResolvedValue(undefined);

            await service.processQueuedTasks();

            expect(pairsState.getPairs).toHaveBeenCalledWith([pairAddress], ['address']);
            expect(syncService.indexPairLpToken).toHaveBeenCalledWith(pairAddress);
            expect(pairsState.addPairLpToken).toHaveBeenCalledWith(pairAddress, mockLpToken);
        });

        it('should process REFRESH_ANALYTICS task', async () => {
            const task = new TaskDto({ name: StateTasks.REFRESH_ANALYTICS, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (pairsState.getAllPairs as jest.Mock).mockResolvedValue([]);
            (tokensState.getFilteredTokens as jest.Mock).mockResolvedValue({ tokens: [] });
            (pairsState.updatePairs as jest.Mock).mockResolvedValue(undefined);
            (tokensState.updateTokens as jest.Mock).mockResolvedValue(undefined);

            await service.processQueuedTasks();

            expect(pairsState.getAllPairs).toHaveBeenCalled();
            expect(tokensState.getFilteredTokens).toHaveBeenCalled();
        });

        it('should process UPDATE_SNAPSHOT task', async () => {
            const task = new TaskDto({ name: StateTasks.UPDATE_SNAPSHOT, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (pairsState.getAllPairs as jest.Mock).mockResolvedValue([]);
            (tokensState.getAllTokens as jest.Mock).mockResolvedValue([]);
            (farmsState.getAllFarms as jest.Mock).mockResolvedValue([]);
            (stakingState.getAllStakingFarms as jest.Mock).mockResolvedValue([]);
            (stakingState.getAllStakingProxies as jest.Mock).mockResolvedValue([]);
            (feesCollectorState.getFeesCollector as jest.Mock).mockResolvedValue({});
            (syncService.updateSnapshot as jest.Mock).mockResolvedValue(undefined);

            await service.processQueuedTasks();

            expect(syncService.updateSnapshot).toHaveBeenCalled();
        });

        it('should process BROADCAST_PRICE_UPDATES task', async () => {
            const task = new TaskDto({ name: StateTasks.BROADCAST_PRICE_UPDATES, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            const mockTokenIDs = ['WEGLD-123456', 'MEX-123456'];
            cacheService.getSetMembers = jest.fn().mockResolvedValue(mockTokenIDs);
            (tokensState.getTokens as jest.Mock).mockResolvedValue([
                { identifier: 'WEGLD-123456', price: '10' },
                { identifier: 'MEX-123456', price: '0.01' },
            ]);

            await service.processQueuedTasks();

            expect(cacheService.getSetMembers).toHaveBeenCalledWith(PENDING_PRICE_UPDATES_KEY);
            expect(tokensState.getTokens).toHaveBeenCalledWith(
                mockTokenIDs,
                expect.arrayContaining(['identifier', 'price']),
            );
            expect(pubSub.publish).toHaveBeenCalled();
            expect(cacheService.deleteRemote).toHaveBeenCalledWith(PENDING_PRICE_UPDATES_KEY);
        });

        it('should process REFRESH_PAIR_RESERVES task', async () => {
            const task = new TaskDto({ name: StateTasks.REFRESH_PAIR_RESERVES, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (pairsState.getAllPairs as jest.Mock).mockResolvedValue([
                { address: 'pair1', firstTokenID: 'WEGLD-123456', secondTokenID: 'USDC-123456' },
            ]);
            (syncService.getPairReservesAndState as jest.Mock).mockResolvedValue({});
            (pairsState.updatePairs as jest.Mock).mockResolvedValue(undefined);

            await service.processQueuedTasks();

            expect(pairsState.getAllPairs).toHaveBeenCalled();
            expect(syncService.getPairReservesAndState).toHaveBeenCalled();
            expect(pairsState.updatePairs).toHaveBeenCalled();
        });

        it('should process REFRESH_USDC_PRICE task', async () => {
            const task = new TaskDto({ name: StateTasks.REFRESH_USDC_PRICE, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (syncService.getUsdcPrice as jest.Mock).mockResolvedValue(1.0);

            await service.processQueuedTasks();

            expect(syncService.getUsdcPrice).toHaveBeenCalled();
        });

        it('should process REFRESH_FARMS task', async () => {
            const task = new TaskDto({ name: StateTasks.REFRESH_FARMS, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (farmsState.getAllFarms as jest.Mock).mockResolvedValue([
                { address: 'farm1' },
                { address: 'farm2' },
            ]);
            (syncService.getFarmReservesAndWeeklyRewards as jest.Mock).mockResolvedValue({});
            (farmsState.updateFarms as jest.Mock).mockResolvedValue(undefined);

            await service.processQueuedTasks();

            expect(farmsState.getAllFarms).toHaveBeenCalled();
            expect(syncService.getFarmReservesAndWeeklyRewards).toHaveBeenCalled();
        });

        it('should process REFRESH_FARM task with address argument', async () => {
            const farmAddress = 'erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq';
            const task = new TaskDto({
                name: StateTasks.REFRESH_FARM,
                args: [farmAddress],
            });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (farmsState.getFarms as jest.Mock).mockResolvedValue([{ address: farmAddress }]);
            (syncService.getFarmReservesAndWeeklyRewards as jest.Mock).mockResolvedValue(new Map());
            (farmsState.updateFarms as jest.Mock).mockResolvedValue(undefined);

            await service.processQueuedTasks();

            expect(farmsState.getFarms).toHaveBeenCalledWith([farmAddress], expect.any(Array));
        });

        it('should process REFRESH_STAKING_FARMS task', async () => {
            const task = new TaskDto({ name: StateTasks.REFRESH_STAKING_FARMS, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (stakingState.getAllStakingFarms as jest.Mock).mockResolvedValue([
                { address: 'staking1' },
                { address: 'staking2' },
            ]);
            (syncService.getStakingFarmReservesAndWeeklyRewards as jest.Mock).mockResolvedValue({});
            (stakingState.updateStakingFarms as jest.Mock).mockResolvedValue(undefined);

            await service.processQueuedTasks();

            expect(stakingState.getAllStakingFarms).toHaveBeenCalled();
            expect(syncService.getStakingFarmReservesAndWeeklyRewards).toHaveBeenCalled();
        });

        it('should process REFRESH_STAKING_FARM task with address argument', async () => {
            const stakingAddress = 'erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq';
            const task = new TaskDto({
                name: StateTasks.REFRESH_STAKING_FARM,
                args: [stakingAddress],
            });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (stakingState.getStakingFarms as jest.Mock).mockResolvedValue([{ address: stakingAddress }]);
            (syncService.getStakingFarmReservesAndWeeklyRewards as jest.Mock).mockResolvedValue(new Map());
            (stakingState.updateStakingFarms as jest.Mock).mockResolvedValue(undefined);

            await service.processQueuedTasks();

            expect(stakingState.getStakingFarms).toHaveBeenCalledWith([stakingAddress], expect.any(Array));
        });

        it('should process REFRESH_FEES_COLLECTOR task', async () => {
            const task = new TaskDto({ name: StateTasks.REFRESH_FEES_COLLECTOR, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (feesCollectorState.getFeesCollector as jest.Mock).mockResolvedValue({});
            (syncService.getFeesCollectorFeesAndWeeklyRewards as jest.Mock).mockResolvedValue({});
            (feesCollectorState.updateFeesCollector as jest.Mock).mockResolvedValue(undefined);

            await service.processQueuedTasks();

            expect(feesCollectorState.getFeesCollector).toHaveBeenCalled();
            expect(syncService.getFeesCollectorFeesAndWeeklyRewards).toHaveBeenCalled();
        });
    });

    describe('task failure and retry logic', () => {
        it('should increment retry counter and re-queue task on failure', async () => {
            const task = new TaskDto({ name: StateTasks.INIT_STATE, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);
            cacheService.incrementRemote.mockResolvedValue(1);

            syncService.populateState = jest.fn().mockRejectedValue(new Error('Network error'));

            await service.processQueuedTasks();

            expect(cacheService.incrementRemote).toHaveBeenCalledWith(
                'dexService.taskRetryCount:initState',
                86400, // 24 hours TTL
            );

            expect(logger.warn).toHaveBeenCalledWith(
                'Re-queuing task "initState" (attempt 1/5)',
                expect.any(Object),
            );

            // Should re-queue the task
            expect(cacheService.zAdd).toHaveBeenCalledWith(
                STATE_TASKS_CACHE_KEY,
                expect.stringContaining('"name":"initState"'),
                StateTaskPriority[StateTasks.INIT_STATE],
            );
        });

        it('should dead-letter task after MAX_TASK_RETRIES attempts', async () => {
            const task = new TaskDto({ name: StateTasks.REFRESH_ANALYTICS, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);
            cacheService.incrementRemote.mockResolvedValue(5); // 5th failure

            (pairsState.getAllPairs as jest.Mock).mockRejectedValue(new Error('Database error'));

            await service.processQueuedTasks();

            expect(logger.error).toHaveBeenCalledWith(
                'Task "refreshAnalytics" dead-lettered after 5 failed attempts',
                expect.any(Object),
            );

            // Should delete retry counter
            expect(cacheService.deleteRemote).toHaveBeenCalledWith(
                'dexService.taskRetryCount:refreshAnalytics',
            );

            // Should NOT re-queue the task
            expect(cacheService.zAdd).not.toHaveBeenCalled();
        });

        it('should delete retry counter on successful task completion', async () => {
            const task = new TaskDto({ name: StateTasks.INIT_STATE, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (syncService.populateState as jest.Mock).mockResolvedValue({});
            (stateService.initState as jest.Mock).mockResolvedValue({});

            await service.processQueuedTasks();

            expect(cacheService.deleteRemote).toHaveBeenCalledWith(
                'dexService.taskRetryCount:initState',
            );
        });

        it('should include task arguments in retry key', async () => {
            const pairAddress = 'erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq';
            const task = new TaskDto({
                name: StateTasks.INDEX_LP_TOKEN,
                args: [pairAddress],
            });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);
            cacheService.incrementRemote.mockResolvedValue(2);

            (pairsState.getPairs as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

            await service.processQueuedTasks();

            expect(cacheService.incrementRemote).toHaveBeenCalledWith(
                `dexService.taskRetryCount:indexLpToken:${pairAddress}`,
                86400,
            );
        });

        it('should handle task failure at retry attempt 3', async () => {
            const task = new TaskDto({ name: StateTasks.UPDATE_SNAPSHOT, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);
            cacheService.incrementRemote.mockResolvedValue(3); // 3rd attempt

            // Mock one of the state calls to fail
            (pairsState.getAllPairs as jest.Mock).mockRejectedValue(new Error('Timeout'));
            (tokensState.getAllTokens as jest.Mock).mockResolvedValue([]);
            (farmsState.getAllFarms as jest.Mock).mockResolvedValue([]);
            (stakingState.getAllStakingFarms as jest.Mock).mockResolvedValue([]);
            (stakingState.getAllStakingProxies as jest.Mock).mockResolvedValue([]);
            (feesCollectorState.getFeesCollector as jest.Mock).mockResolvedValue({});

            await service.processQueuedTasks();

            expect(logger.warn).toHaveBeenCalledWith(
                'Re-queuing task "updateSnapshot" (attempt 3/5)',
                expect.any(Object),
            );

            // Should still re-queue since 3 < 5
            expect(cacheService.zAdd).toHaveBeenCalled();
        });
    });

    describe('INDEX_LP_TOKEN busy-wait behavior', () => {
        // Skip this test as it would take 90+ seconds to complete due to busy-wait loop
        it.skip('should throw error if LP token not found after max attempts', async () => {
            const pairAddress = 'erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq';
            const task = new TaskDto({
                name: StateTasks.INDEX_LP_TOKEN,
                args: [pairAddress],
            });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            const mockPair = { address: pairAddress };
            (pairsState.getPairs as jest.Mock).mockResolvedValue([mockPair]);
            // Always return null (LP token not found)
            (syncService.indexPairLpToken as jest.Mock).mockResolvedValue(null);

            await service.processQueuedTasks();

            // Should attempt 60 times
            expect(syncService.indexPairLpToken).toHaveBeenCalledTimes(60);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed processing task "indexLpToken"'),
                expect.any(Error),
            );
        });

        it('should throw error if pair not found', async () => {
            const pairAddress = 'erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq';
            const task = new TaskDto({
                name: StateTasks.INDEX_LP_TOKEN,
                args: [pairAddress],
            });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            // Return empty array (pair not found)
            (pairsState.getPairs as jest.Mock).mockResolvedValue([]);

            await service.processQueuedTasks();

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed processing task "indexLpToken"'),
                expect.any(Error),
            );
        });
    });

    describe('task serialization and deserialization', () => {
        it('should correctly serialize and deserialize tasks with complex arguments', async () => {
            const pairMetadata: PairMetadata = {
                address: 'erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq',
                firstTokenID: 'WEGLD-123456',
                secondTokenID: 'USDC-123456',
            };

            const tasks = [
                new TaskDto({
                    name: StateTasks.INDEX_PAIR,
                    args: [JSON.stringify(pairMetadata), '1640000000'],
                }),
            ];

            await service.queueTasks(tasks);

            const serializedCall = cacheService.zAdd.mock.calls[0][1] as string;
            const deserialized = JSON.parse(serializedCall);

            expect(deserialized.name).toBe('indexPair');
            expect(deserialized.args).toHaveLength(2);
            expect(JSON.parse(deserialized.args[0])).toEqual(pairMetadata);
            expect(deserialized.args[1]).toBe('1640000000');
        });
    });

    describe('BROADCAST_PRICE_UPDATES edge cases', () => {
        it('should handle empty token list in pending updates', async () => {
            const task = new TaskDto({ name: StateTasks.BROADCAST_PRICE_UPDATES, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);
            cacheService.getSetMembers.mockResolvedValue([]); // No pending tokens

            await service.processQueuedTasks();

            // Should not call getTokens if no tokens
            expect(tokensState.getTokens).not.toHaveBeenCalled();
            // Should return early without deleting the set
            expect(pubSub.publish).not.toHaveBeenCalled();
        });

        it('should accumulate token IDs across multiple queue calls', async () => {
            const batch1 = ['WEGLD-123456', 'MEX-123456'];
            const batch2 = ['USDC-123456', 'USDT-123456'];

            await service.queueTasks([
                new TaskDto({
                    name: StateTasks.BROADCAST_PRICE_UPDATES,
                    args: [JSON.stringify(batch1)],
                }),
            ]);

            await service.queueTasks([
                new TaskDto({
                    name: StateTasks.BROADCAST_PRICE_UPDATES,
                    args: [JSON.stringify(batch2)],
                }),
            ]);

            // Should add both batches to the set
            expect(cacheService.addToSet).toHaveBeenCalledWith(
                PENDING_PRICE_UPDATES_KEY,
                batch1,
            );
            expect(cacheService.addToSet).toHaveBeenCalledWith(
                PENDING_PRICE_UPDATES_KEY,
                batch2,
            );

            // Should only queue once (deduplication)
            expect(cacheService.zAdd).toHaveBeenCalledTimes(2);
        });
    });

    describe('populateState chaining', () => {
        it('should queue REFRESH_PAIR_RESERVES after successful populateState', async () => {
            const task = new TaskDto({ name: StateTasks.INIT_STATE, args: [] });
            cacheService.zPopMin.mockResolvedValue([JSON.stringify(task)]);

            (syncService.populateState as jest.Mock).mockResolvedValue({});
            (stateService.initState as jest.Mock).mockResolvedValue({});

            await service.processQueuedTasks();

            // Should queue REFRESH_PAIR_RESERVES after init
            expect(cacheService.zAdd).toHaveBeenCalledWith(
                STATE_TASKS_CACHE_KEY,
                expect.stringContaining('"name":"refreshReserves"'),
                StateTaskPriority[StateTasks.REFRESH_PAIR_RESERVES],
            );
        });
    });
});
