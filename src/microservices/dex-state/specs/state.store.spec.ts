import { Test, TestingModule } from '@nestjs/testing';
import { StateStore } from '../services/state.store';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';
import {
    createMockToken,
    createMockPair,
    createMockFarm,
    createMockStakingFarm,
    createMockStakingProxy,
    createMockFeesCollector,
    TEST_ADDRESSES,
    TEST_TOKEN_IDS,
} from './test.utils';

describe('StateStore', () => {
    let module: TestingModule;
    let stateStore: StateStore;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            providers: [StateStore],
        }).compile();

        stateStore = module.get<StateStore>(StateStore);
    });

    afterEach(() => {
        stateStore.clearAll();
    });

    describe('Token Operations', () => {
        it('should set and get a token', () => {
            const token = createMockToken(TEST_TOKEN_IDS.WEGLD);
            stateStore.setToken(TEST_TOKEN_IDS.WEGLD, token);

            const result = stateStore.tokens.get(TEST_TOKEN_IDS.WEGLD);
            expect(result).toBeDefined();
            expect(result?.identifier).toBe(TEST_TOKEN_IDS.WEGLD);
        });

        it('should overwrite existing token', () => {
            const token1 = createMockToken(TEST_TOKEN_IDS.WEGLD, { price: '10' });
            const token2 = createMockToken(TEST_TOKEN_IDS.WEGLD, { price: '20' });

            stateStore.setToken(TEST_TOKEN_IDS.WEGLD, token1);
            stateStore.setToken(TEST_TOKEN_IDS.WEGLD, token2);

            const result = stateStore.tokens.get(TEST_TOKEN_IDS.WEGLD);
            expect(result?.price).toBe('20');
        });

        it('should return undefined for non-existent token', () => {
            const result = stateStore.tokens.get('NON-EXISTENT');
            expect(result).toBeUndefined();
        });

        it('should get all tokens', () => {
            stateStore.setToken(TEST_TOKEN_IDS.WEGLD, createMockToken(TEST_TOKEN_IDS.WEGLD));
            stateStore.setToken(TEST_TOKEN_IDS.USDC, createMockToken(TEST_TOKEN_IDS.USDC));
            stateStore.setToken(TEST_TOKEN_IDS.MEX, createMockToken(TEST_TOKEN_IDS.MEX));

            expect(stateStore.tokens.size).toBe(3);
        });

        it('should check if token exists using Map.has', () => {
            stateStore.setToken(TEST_TOKEN_IDS.WEGLD, createMockToken(TEST_TOKEN_IDS.WEGLD));

            expect(stateStore.tokens.has(TEST_TOKEN_IDS.WEGLD)).toBe(true);
            expect(stateStore.tokens.has('NON-EXISTENT')).toBe(false);
        });

        it('should iterate over all tokens', () => {
            const tokenIds = [TEST_TOKEN_IDS.WEGLD, TEST_TOKEN_IDS.USDC, TEST_TOKEN_IDS.MEX];
            tokenIds.forEach(id => stateStore.setToken(id, createMockToken(id)));

            const retrievedIds: string[] = [];
            stateStore.tokens.forEach((_, key) => retrievedIds.push(key));

            expect(retrievedIds).toHaveLength(3);
            expect(retrievedIds).toContain(TEST_TOKEN_IDS.WEGLD);
            expect(retrievedIds).toContain(TEST_TOKEN_IDS.USDC);
            expect(retrievedIds).toContain(TEST_TOKEN_IDS.MEX);
        });
    });

    describe('Pair Operations', () => {
        it('should set and get a pair', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX);
            stateStore.setPair(TEST_ADDRESSES.PAIR_EGLD_MEX, pair);

            const result = stateStore.pairs.get(TEST_ADDRESSES.PAIR_EGLD_MEX);
            expect(result).toBeDefined();
            expect(result?.address).toBe(TEST_ADDRESSES.PAIR_EGLD_MEX);
        });

        it('should overwrite existing pair', () => {
            const pair1 = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, { lockedValueUSD: '1000000' });
            const pair2 = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, { lockedValueUSD: '2000000' });

            stateStore.setPair(TEST_ADDRESSES.PAIR_EGLD_MEX, pair1);
            stateStore.setPair(TEST_ADDRESSES.PAIR_EGLD_MEX, pair2);

            const result = stateStore.pairs.get(TEST_ADDRESSES.PAIR_EGLD_MEX);
            expect(result?.lockedValueUSD).toBe('2000000');
        });

        it('should return undefined for non-existent pair', () => {
            const result = stateStore.pairs.get('erd1nonexistent');
            expect(result).toBeUndefined();
        });

        it('should get all pairs', () => {
            stateStore.setPair(TEST_ADDRESSES.PAIR_EGLD_MEX, createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX));
            stateStore.setPair(TEST_ADDRESSES.PAIR_EGLD_USDC, createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC));

            expect(stateStore.pairs.size).toBe(2);
        });

        it('should iterate over all pairs using forEach', () => {
            stateStore.setPair(TEST_ADDRESSES.PAIR_EGLD_MEX, createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX));
            stateStore.setPair(TEST_ADDRESSES.PAIR_EGLD_USDC, createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC));

            const addresses: string[] = [];
            stateStore.pairs.forEach((_, key) => addresses.push(key));

            expect(addresses).toHaveLength(2);
            expect(addresses).toContain(TEST_ADDRESSES.PAIR_EGLD_MEX);
            expect(addresses).toContain(TEST_ADDRESSES.PAIR_EGLD_USDC);
        });
    });

    describe('Farm Operations', () => {
        it('should set and get a farm', () => {
            const farm = createMockFarm(TEST_ADDRESSES.FARM_1);
            stateStore.setFarm(TEST_ADDRESSES.FARM_1, farm);

            const result = stateStore.farms.get(TEST_ADDRESSES.FARM_1);
            expect(result).toBeDefined();
            expect(result?.address).toBe(TEST_ADDRESSES.FARM_1);
        });

        it('should overwrite existing farm', () => {
            const farm1 = createMockFarm(TEST_ADDRESSES.FARM_1, { baseApr: '50' });
            const farm2 = createMockFarm(TEST_ADDRESSES.FARM_1, { baseApr: '75' });

            stateStore.setFarm(TEST_ADDRESSES.FARM_1, farm1);
            stateStore.setFarm(TEST_ADDRESSES.FARM_1, farm2);

            const result = stateStore.farms.get(TEST_ADDRESSES.FARM_1);
            expect(result?.baseApr).toBe('75');
        });

        it('should return undefined for non-existent farm', () => {
            const result = stateStore.farms.get('erd1nonexistent');
            expect(result).toBeUndefined();
        });

        it('should get all farms', () => {
            stateStore.setFarm(TEST_ADDRESSES.FARM_1, createMockFarm(TEST_ADDRESSES.FARM_1));
            stateStore.setFarm(TEST_ADDRESSES.FARM_2, createMockFarm(TEST_ADDRESSES.FARM_2));

            expect(stateStore.farms.size).toBe(2);
        });
    });

    describe('Staking Farm Operations', () => {
        it('should set and get a staking farm', () => {
            const stakingFarm = createMockStakingFarm(TEST_ADDRESSES.STAKING_1);
            stateStore.setStakingFarm(TEST_ADDRESSES.STAKING_1, stakingFarm);

            const result = stateStore.stakingFarms.get(TEST_ADDRESSES.STAKING_1);
            expect(result).toBeDefined();
            expect(result?.address).toBe(TEST_ADDRESSES.STAKING_1);
        });

        it('should overwrite existing staking farm', () => {
            const farm1 = createMockStakingFarm(TEST_ADDRESSES.STAKING_1, { apr: '25' });
            const farm2 = createMockStakingFarm(TEST_ADDRESSES.STAKING_1, { apr: '30' });

            stateStore.setStakingFarm(TEST_ADDRESSES.STAKING_1, farm1);
            stateStore.setStakingFarm(TEST_ADDRESSES.STAKING_1, farm2);

            const result = stateStore.stakingFarms.get(TEST_ADDRESSES.STAKING_1);
            expect(result?.apr).toBe('30');
        });

        it('should return undefined for non-existent staking farm', () => {
            const result = stateStore.stakingFarms.get('erd1nonexistent');
            expect(result).toBeUndefined();
        });

        it('should get all staking farms', () => {
            stateStore.setStakingFarm(TEST_ADDRESSES.STAKING_1, createMockStakingFarm(TEST_ADDRESSES.STAKING_1));
            stateStore.setStakingFarm(TEST_ADDRESSES.STAKING_2, createMockStakingFarm(TEST_ADDRESSES.STAKING_2));

            expect(stateStore.stakingFarms.size).toBe(2);
        });
    });

    describe('Staking Proxy Operations', () => {
        it('should set and get a staking proxy', () => {
            const proxy = createMockStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1);
            stateStore.setStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1, proxy);

            const result = stateStore.stakingProxies.get(TEST_ADDRESSES.STAKING_PROXY_1);
            expect(result).toBeDefined();
            expect(result?.address).toBe(TEST_ADDRESSES.STAKING_PROXY_1);
        });

        it('should overwrite existing staking proxy', () => {
            const proxy1 = createMockStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1, { stakingMinUnboundEpochs: 10 });
            const proxy2 = createMockStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1, { stakingMinUnboundEpochs: 15 });

            stateStore.setStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1, proxy1);
            stateStore.setStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1, proxy2);

            const result = stateStore.stakingProxies.get(TEST_ADDRESSES.STAKING_PROXY_1);
            expect(result?.stakingMinUnboundEpochs).toBe(15);
        });

        it('should get all staking proxies', () => {
            stateStore.setStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1, createMockStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1));

            expect(stateStore.stakingProxies.size).toBe(1);
        });
    });

    describe('Fees Collector Operations', () => {
        it('should set and get fees collector', () => {
            const feesCollector = createMockFeesCollector();
            stateStore.setFeesCollector(feesCollector);

            const result = stateStore.feesCollector;
            expect(result).toBeDefined();
            expect(result?.address).toBe(TEST_ADDRESSES.FEES_COLLECTOR);
        });

        it('should overwrite existing fees collector', () => {
            const fc1 = createMockFeesCollector({ startWeek: 1 });
            const fc2 = createMockFeesCollector({ startWeek: 5 });

            stateStore.setFeesCollector(fc1);
            stateStore.setFeesCollector(fc2);

            expect(stateStore.feesCollector?.startWeek).toBe(5);
        });

        it('should return undefined when fees collector not set', () => {
            expect(stateStore.feesCollector).toBeUndefined();
        });
    });

    describe('Index Management - Token Pairs', () => {
        it('should add token pair mapping', () => {
            stateStore.addTokenPair(TEST_TOKEN_IDS.WEGLD, TEST_ADDRESSES.PAIR_EGLD_MEX);

            const pairs = stateStore.tokenPairs.get(TEST_TOKEN_IDS.WEGLD);
            expect(pairs).toContain(TEST_ADDRESSES.PAIR_EGLD_MEX);
        });

        it('should add multiple pairs for same token', () => {
            stateStore.addTokenPair(TEST_TOKEN_IDS.WEGLD, TEST_ADDRESSES.PAIR_EGLD_MEX);
            stateStore.addTokenPair(TEST_TOKEN_IDS.WEGLD, TEST_ADDRESSES.PAIR_EGLD_USDC);

            const pairs = stateStore.tokenPairs.get(TEST_TOKEN_IDS.WEGLD);
            expect(pairs).toHaveLength(2);
            expect(pairs).toContain(TEST_ADDRESSES.PAIR_EGLD_MEX);
            expect(pairs).toContain(TEST_ADDRESSES.PAIR_EGLD_USDC);
        });

        it('should not add duplicate pair addresses', () => {
            stateStore.addTokenPair(TEST_TOKEN_IDS.WEGLD, TEST_ADDRESSES.PAIR_EGLD_MEX);
            stateStore.addTokenPair(TEST_TOKEN_IDS.WEGLD, TEST_ADDRESSES.PAIR_EGLD_MEX);

            const pairs = stateStore.tokenPairs.get(TEST_TOKEN_IDS.WEGLD);
            expect(pairs).toHaveLength(1);
            expect(pairs).toContain(TEST_ADDRESSES.PAIR_EGLD_MEX);
        });

        it('should return undefined for token with no pairs', () => {
            const pairs = stateStore.tokenPairs.get(TEST_TOKEN_IDS.MEX);
            expect(pairs).toBeUndefined();
        });
    });

    describe('Index Management - Tokens By Type', () => {
        it('should add token by type', () => {
            stateStore.addTokenByType(EsdtTokenType.FungibleToken, TEST_TOKEN_IDS.WEGLD);

            const tokens = stateStore.tokensByType.get(EsdtTokenType.FungibleToken);
            expect(tokens).toContain(TEST_TOKEN_IDS.WEGLD);
        });

        it('should add multiple tokens of same type', () => {
            stateStore.addTokenByType(EsdtTokenType.FungibleToken, TEST_TOKEN_IDS.WEGLD);
            stateStore.addTokenByType(EsdtTokenType.FungibleToken, TEST_TOKEN_IDS.USDC);

            const tokens = stateStore.tokensByType.get(EsdtTokenType.FungibleToken);
            expect(tokens).toHaveLength(2);
        });

        it('should handle LP token type separately', () => {
            stateStore.addTokenByType(EsdtTokenType.FungibleToken, TEST_TOKEN_IDS.WEGLD);
            stateStore.addTokenByType(EsdtTokenType.FungibleLpToken, TEST_TOKEN_IDS.LP_EGLD_MEX);

            expect(stateStore.tokensByType.get(EsdtTokenType.FungibleToken)).toContain(TEST_TOKEN_IDS.WEGLD);
            expect(stateStore.tokensByType.get(EsdtTokenType.FungibleLpToken)).toContain(TEST_TOKEN_IDS.LP_EGLD_MEX);
        });
    });

    describe('Index Management - Active Pairs', () => {
        it('should add active pair', () => {
            stateStore.addActivePair(TEST_ADDRESSES.PAIR_EGLD_MEX);

            expect(stateStore.activePairs.has(TEST_ADDRESSES.PAIR_EGLD_MEX)).toBe(true);
        });

        it('should deduplicate active pairs (Set behavior)', () => {
            stateStore.addActivePair(TEST_ADDRESSES.PAIR_EGLD_MEX);
            stateStore.addActivePair(TEST_ADDRESSES.PAIR_EGLD_MEX);

            expect(stateStore.activePairs.size).toBe(1);
        });

        it('should track multiple active pairs', () => {
            stateStore.addActivePair(TEST_ADDRESSES.PAIR_EGLD_MEX);
            stateStore.addActivePair(TEST_ADDRESSES.PAIR_EGLD_USDC);

            expect(stateStore.activePairs.size).toBe(2);
            expect(stateStore.activePairs.has(TEST_ADDRESSES.PAIR_EGLD_MEX)).toBe(true);
            expect(stateStore.activePairs.has(TEST_ADDRESSES.PAIR_EGLD_USDC)).toBe(true);
        });
    });

    describe('Index Management - Active Pairs Tokens', () => {
        it('should add active pairs token', () => {
            stateStore.addActivePairsToken(TEST_TOKEN_IDS.WEGLD);

            expect(stateStore.activePairsTokens.has(TEST_TOKEN_IDS.WEGLD)).toBe(true);
        });

        it('should deduplicate active pairs tokens (Set behavior)', () => {
            stateStore.addActivePairsToken(TEST_TOKEN_IDS.WEGLD);
            stateStore.addActivePairsToken(TEST_TOKEN_IDS.WEGLD);

            expect(stateStore.activePairsTokens.size).toBe(1);
        });

        it('should track multiple active pairs tokens', () => {
            stateStore.addActivePairsToken(TEST_TOKEN_IDS.WEGLD);
            stateStore.addActivePairsToken(TEST_TOKEN_IDS.USDC);

            expect(stateStore.activePairsTokens.size).toBe(2);
        });
    });

    describe('Index Management - Farm Pairs', () => {
        it('should add farm to pair mapping', () => {
            stateStore.addFarmPair(TEST_ADDRESSES.FARM_1, TEST_ADDRESSES.PAIR_EGLD_MEX);

            expect(stateStore.farmsPairs.get(TEST_ADDRESSES.FARM_1)).toBe(TEST_ADDRESSES.PAIR_EGLD_MEX);
        });

        it('should overwrite existing farm pair mapping', () => {
            stateStore.addFarmPair(TEST_ADDRESSES.FARM_1, TEST_ADDRESSES.PAIR_EGLD_MEX);
            stateStore.addFarmPair(TEST_ADDRESSES.FARM_1, TEST_ADDRESSES.PAIR_EGLD_USDC);

            expect(stateStore.farmsPairs.get(TEST_ADDRESSES.FARM_1)).toBe(TEST_ADDRESSES.PAIR_EGLD_USDC);
        });

        it('should return undefined for farm with no pair mapping', () => {
            expect(stateStore.farmsPairs.get(TEST_ADDRESSES.FARM_1)).toBeUndefined();
        });
    });

    describe('Index Management - Staking Farm Pairs', () => {
        it('should add staking farm to pair mapping', () => {
            stateStore.addStakingFarmPair(TEST_ADDRESSES.STAKING_1, TEST_ADDRESSES.PAIR_EGLD_MEX);

            expect(stateStore.stakingFarmsPairs.get(TEST_ADDRESSES.STAKING_1)).toBe(TEST_ADDRESSES.PAIR_EGLD_MEX);
        });

        it('should overwrite existing staking farm pair mapping', () => {
            stateStore.addStakingFarmPair(TEST_ADDRESSES.STAKING_1, TEST_ADDRESSES.PAIR_EGLD_MEX);
            stateStore.addStakingFarmPair(TEST_ADDRESSES.STAKING_1, TEST_ADDRESSES.PAIR_EGLD_USDC);

            expect(stateStore.stakingFarmsPairs.get(TEST_ADDRESSES.STAKING_1)).toBe(TEST_ADDRESSES.PAIR_EGLD_USDC);
        });
    });

    describe('Scalar Values - USDC Price', () => {
        it('should set and get USDC price', () => {
            stateStore.setUsdcPrice(1.0);

            expect(stateStore.usdcPrice).toBe(1.0);
        });

        it('should default to 0', () => {
            expect(stateStore.usdcPrice).toBe(0);
        });

        it('should handle decimal prices', () => {
            stateStore.setUsdcPrice(0.9998);

            expect(stateStore.usdcPrice).toBe(0.9998);
        });
    });

    describe('Scalar Values - Common Token IDs', () => {
        it('should set and get common token IDs', () => {
            const tokenIds = [TEST_TOKEN_IDS.WEGLD, TEST_TOKEN_IDS.USDC];
            stateStore.setCommonTokenIDs(tokenIds);

            expect(stateStore.commonTokenIDs).toEqual(tokenIds);
        });

        it('should default to empty array', () => {
            expect(stateStore.commonTokenIDs).toEqual([]);
        });

        it('should overwrite existing common token IDs', () => {
            stateStore.setCommonTokenIDs([TEST_TOKEN_IDS.WEGLD]);
            stateStore.setCommonTokenIDs([TEST_TOKEN_IDS.USDC, TEST_TOKEN_IDS.MEX]);

            expect(stateStore.commonTokenIDs).toEqual([TEST_TOKEN_IDS.USDC, TEST_TOKEN_IDS.MEX]);
        });
    });

    describe('Scalar Values - Locked Token Collection', () => {
        it('should set and get locked token collection', () => {
            stateStore.setLockedTokenCollection('XMEX-123456');

            expect(stateStore.lockedTokenCollection).toBe('XMEX-123456');
        });

        it('should default to undefined', () => {
            expect(stateStore.lockedTokenCollection).toBeUndefined();
        });
    });

    describe('State Management - Initialization', () => {
        it('should set initialized flag', () => {
            stateStore.setInitialized(true);

            expect(stateStore.isInitialized()).toBe(true);
        });

        it('should default to not initialized', () => {
            expect(stateStore.isInitialized()).toBe(false);
        });

        it('should toggle initialized flag', () => {
            stateStore.setInitialized(true);
            expect(stateStore.isInitialized()).toBe(true);

            stateStore.setInitialized(false);
            expect(stateStore.isInitialized()).toBe(false);
        });
    });

    describe('State Management - clearAll', () => {
        it('should clear all primary data stores', () => {
            stateStore.setToken(TEST_TOKEN_IDS.WEGLD, createMockToken(TEST_TOKEN_IDS.WEGLD));
            stateStore.setPair(TEST_ADDRESSES.PAIR_EGLD_MEX, createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX));
            stateStore.setFarm(TEST_ADDRESSES.FARM_1, createMockFarm(TEST_ADDRESSES.FARM_1));
            stateStore.setStakingFarm(TEST_ADDRESSES.STAKING_1, createMockStakingFarm(TEST_ADDRESSES.STAKING_1));
            stateStore.setStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1, createMockStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1));
            stateStore.setFeesCollector(createMockFeesCollector());

            stateStore.clearAll();

            expect(stateStore.tokens.size).toBe(0);
            expect(stateStore.pairs.size).toBe(0);
            expect(stateStore.farms.size).toBe(0);
            expect(stateStore.stakingFarms.size).toBe(0);
            expect(stateStore.stakingProxies.size).toBe(0);
            expect(stateStore.feesCollector).toBeUndefined();
        });

        it('should clear all derived indexes', () => {
            stateStore.addTokenPair(TEST_TOKEN_IDS.WEGLD, TEST_ADDRESSES.PAIR_EGLD_MEX);
            stateStore.addTokenByType(EsdtTokenType.FungibleToken, TEST_TOKEN_IDS.MEX);
            stateStore.addActivePair(TEST_ADDRESSES.PAIR_EGLD_MEX);
            stateStore.addActivePairsToken(TEST_TOKEN_IDS.WEGLD);
            stateStore.addFarmPair(TEST_ADDRESSES.FARM_1, TEST_ADDRESSES.PAIR_EGLD_MEX);
            stateStore.addStakingFarmPair(TEST_ADDRESSES.STAKING_1, TEST_ADDRESSES.PAIR_EGLD_MEX);

            stateStore.clearAll();

            expect(stateStore.tokenPairs.size).toBe(0);
            expect(stateStore.activePairs.size).toBe(0);
            expect(stateStore.activePairsTokens.size).toBe(0);
            expect(stateStore.farmsPairs.size).toBe(0);
            expect(stateStore.stakingFarmsPairs.size).toBe(0);
        });

        it('should initialize tokensByType with empty arrays for FungibleToken and FungibleLpToken', () => {
            stateStore.addTokenByType(EsdtTokenType.FungibleToken, TEST_TOKEN_IDS.WEGLD);
            stateStore.addTokenByType(EsdtTokenType.FungibleLpToken, TEST_TOKEN_IDS.LP_EGLD_MEX);

            stateStore.clearAll();

            expect(stateStore.tokensByType.get(EsdtTokenType.FungibleToken)).toEqual([]);
            expect(stateStore.tokensByType.get(EsdtTokenType.FungibleLpToken)).toEqual([]);
            expect(stateStore.tokensByType.size).toBe(2);
        });

        it('should set initialized to false', () => {
            stateStore.setInitialized(true);

            stateStore.clearAll();

            expect(stateStore.isInitialized()).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('should throw when setting a token with empty identifier', () => {
            const token = createMockToken('');

            expect(() => stateStore.setToken('', token)).toThrow(
                'Token identifier must not be empty',
            );
            expect(stateStore.tokens.has('')).toBe(false);
        });

        it('should handle very long identifiers', () => {
            const longId = 'A'.repeat(100);
            const token = createMockToken(longId);
            stateStore.setToken(longId, token);

            expect(stateStore.tokens.get(longId)?.identifier).toBe(longId);
        });

        it('should preserve object references (mutable)', () => {
            const token = createMockToken(TEST_TOKEN_IDS.WEGLD, { price: '10' });
            stateStore.setToken(TEST_TOKEN_IDS.WEGLD, token);

            const retrieved = stateStore.tokens.get(TEST_TOKEN_IDS.WEGLD);
            retrieved!.price = '20';

            const retrievedAgain = stateStore.tokens.get(TEST_TOKEN_IDS.WEGLD);
            expect(retrievedAgain?.price).toBe('20');
        });

        it('should handle concurrent additions to same index', () => {
            const operations = [
                () => stateStore.addTokenPair(TEST_TOKEN_IDS.WEGLD, TEST_ADDRESSES.PAIR_EGLD_MEX),
                () => stateStore.addTokenPair(TEST_TOKEN_IDS.WEGLD, TEST_ADDRESSES.PAIR_EGLD_USDC),
            ];

            operations.forEach(op => op());

            const pairs = stateStore.tokenPairs.get(TEST_TOKEN_IDS.WEGLD);
            expect(pairs).toHaveLength(2);
        });

        it('should maintain separate Maps for different entity types', () => {
            const sameAddress = TEST_ADDRESSES.PAIR_EGLD_MEX;
            const pair = createMockPair(sameAddress);
            const farm = createMockFarm(sameAddress);

            stateStore.setPair(sameAddress, pair);
            stateStore.setFarm(sameAddress, farm);

            expect(stateStore.pairs.get(sameAddress)).toBeDefined();
            expect(stateStore.farms.get(sameAddress)).toBeDefined();
            expect(stateStore.pairs.get(sameAddress)).not.toBe(stateStore.farms.get(sameAddress));
        });
    });

    describe('Direct Getter Access', () => {
        it('should return direct reference to tokens Map', () => {
            const tokens1 = stateStore.tokens;
            const tokens2 = stateStore.tokens;

            expect(tokens1).toBe(tokens2);
        });

        it('should return direct reference to pairs Map', () => {
            const pairs1 = stateStore.pairs;
            const pairs2 = stateStore.pairs;

            expect(pairs1).toBe(pairs2);
        });

        it('should return direct reference to activePairs Set', () => {
            const set1 = stateStore.activePairs;
            const set2 = stateStore.activePairs;

            expect(set1).toBe(set2);
        });
    });
});
