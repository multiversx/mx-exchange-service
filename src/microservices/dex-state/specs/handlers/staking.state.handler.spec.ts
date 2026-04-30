import { Test, TestingModule } from '@nestjs/testing';
import { StakingStateHandler } from '../../services/handlers/staking.state.handler';
import { StateStore } from '../../services/state.store';
import { StakingComputeService } from '../../services/compute/staking.compute.service';
import { MockStakingComputeServiceProvider } from '../mocks/compute.services.mock';
import {
    createMockStakingFarm,
    createMockStakingProxy,
    createMockPair,
    createMockToken,
    TEST_ADDRESSES,
    TEST_TOKEN_IDS,
} from '../test.utils';
import { PairCompoundedAPRModel } from 'src/modules/pair/models/pair.compounded.apr.model';
import { GetFilteredStakingFarmsRequest, StakingFarmSortField, SortOrder } from '../../interfaces/dex_state.interfaces';

describe('StakingStateHandler', () => {
    let handler: StakingStateHandler;
    let stateStore: StateStore;
    let computeService: StakingComputeService;

    // Helper function to create a default GetFilteredStakingFarmsRequest
    const createFilterRequest = (overrides: Partial<GetFilteredStakingFarmsRequest> = {}): GetFilteredStakingFarmsRequest => ({
        searchToken: '',
        rewardsEnded: undefined,
        sortField: StakingFarmSortField.STAKING_SORT_UNSPECIFIED,
        sortOrder: SortOrder.SORT_ASC,
        offset: 0,
        limit: 100,
        fields: { paths: [] },
        ...overrides,
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StakingStateHandler,
                StateStore,
                MockStakingComputeServiceProvider,
            ],
        }).compile();

        handler = module.get<StakingStateHandler>(StakingStateHandler);
        stateStore = module.get<StateStore>(StateStore);
        computeService = module.get<StakingComputeService>(StakingComputeService);

        // Set up test tokens first
        const rideToken = createMockToken(TEST_TOKEN_IDS.RIDE, {
            name: 'Holoride',
            ticker: 'RIDE',
        });
        stateStore.setToken(TEST_TOKEN_IDS.RIDE, rideToken);

        // Populate state store with test staking farms
        const mockStaking1 = createMockStakingFarm(TEST_ADDRESSES.STAKING_1, {
            farmingTokenId: TEST_TOKEN_IDS.RIDE,
            baseApr: '25',
            maxBoostedApr: '100',
            apr: '50',
            stakedValueUSD: '5000000',
            isProducingRewards: true,
        });
        stateStore.setStakingFarm(TEST_ADDRESSES.STAKING_1, mockStaking1);

        const mockStaking2 = createMockStakingFarm(TEST_ADDRESSES.STAKING_2, {
            farmingTokenId: TEST_TOKEN_IDS.RIDE,
            baseApr: '15',
            maxBoostedApr: '60',
            apr: '30',
            stakedValueUSD: '3000000',
            isProducingRewards: false, // Rewards ended
        });
        stateStore.setStakingFarm(TEST_ADDRESSES.STAKING_2, mockStaking2);

        // Set up staking farm-pair mappings
        stateStore.stakingFarmsPairs.set(TEST_ADDRESSES.STAKING_1, TEST_ADDRESSES.PAIR_EGLD_MEX);
        stateStore.stakingFarmsPairs.set(TEST_ADDRESSES.STAKING_2, TEST_ADDRESSES.PAIR_EGLD_USDC);

        // Populate with test pair
        const mockPair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
            compoundedAPR: new PairCompoundedAPRModel({
                address: TEST_ADDRESSES.PAIR_EGLD_MEX,
                feesAPR: '10.95',
                farmBaseAPR: '0',
                farmBoostedAPR: '0',
                dualFarmBaseAPR: '0',
                dualFarmBoostedAPR: '0',
            }),
        });
        stateStore.setPair(TEST_ADDRESSES.PAIR_EGLD_MEX, mockPair);

        // Populate with test staking proxies
        const mockProxy1 = createMockStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1);
        const mockProxy2 = createMockStakingProxy(TEST_ADDRESSES.STAKING_PROXY_2);
        stateStore.setStakingProxy(TEST_ADDRESSES.STAKING_PROXY_1, mockProxy1);
        stateStore.setStakingProxy(TEST_ADDRESSES.STAKING_PROXY_2, mockProxy2);
    });

    describe('getStakingFarms', () => {
        it('should throw error when staking farm not found', () => {
            const unknownAddress = 'erd1qqqqqqqqqqqqqunknown';

            expect(() => handler.getStakingFarms([unknownAddress])).toThrow(
                `Staking farm ${unknownAddress} not found`,
            );
        });

        it('should return full staking farms when fields not specified', () => {
            const result = handler.getStakingFarms([TEST_ADDRESSES.STAKING_1]);

            expect(result).toBeDefined();
            expect(result.stakingFarms).toHaveLength(1);
            expect(result.stakingFarms[0].address).toBe(TEST_ADDRESSES.STAKING_1);
            expect(result.stakingFarms[0].baseApr).toBe('25');
            expect(result.stakingFarms[0].maxBoostedApr).toBe('100');
        });

        it('should return partial staking farms with only requested fields', () => {
            const result = handler.getStakingFarms([TEST_ADDRESSES.STAKING_1], ['address', 'baseApr']);

            expect(result).toBeDefined();
            expect(result.stakingFarms).toHaveLength(1);
            expect(result.stakingFarms[0].address).toBe(TEST_ADDRESSES.STAKING_1);
            expect(result.stakingFarms[0].baseApr).toBe('25');
            expect(result.stakingFarms[0].maxBoostedApr).toBeUndefined();
        });

        it('should handle multiple staking farms', () => {
            const result = handler.getStakingFarms([
                TEST_ADDRESSES.STAKING_1,
                TEST_ADDRESSES.STAKING_2,
            ]);

            expect(result).toBeDefined();
            expect(result.stakingFarms).toHaveLength(2);
            expect(result.stakingFarms[0].address).toBe(TEST_ADDRESSES.STAKING_1);
            expect(result.stakingFarms[1].address).toBe(TEST_ADDRESSES.STAKING_2);
        });
    });

    describe('getAllStakingFarms', () => {
        it('should return empty array when no staking farms exist', () => {
            stateStore.clearAll();

            const result = handler.getAllStakingFarms();

            expect(result).toBeDefined();
            expect(result.stakingFarms).toHaveLength(0);
        });

        it('should return all staking farms when they exist', () => {
            const result = handler.getAllStakingFarms();

            expect(result).toBeDefined();
            expect(result.stakingFarms).toHaveLength(2);
        });
    });

    describe('getFilteredStakingFarms', () => {
        it('should filter by searchToken on farming token', () => {
            const request = createFilterRequest({
                searchToken: 'RIDE',
            });

            const result = handler.getFilteredStakingFarms(request);

            expect(result.stakingFarms).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should filter by rewardsEnded', () => {
            const request = createFilterRequest({
                rewardsEnded: true,
            });

            const result = handler.getFilteredStakingFarms(request);

            // Only farms with isProducingRewards=false should be returned
            expect(result.stakingFarms).toHaveLength(1);
            expect(result.stakingFarms[0].address).toBe(TEST_ADDRESSES.STAKING_2);
        });

        it('should sort by APR', () => {
            const request = createFilterRequest({
                sortField: StakingFarmSortField.STAKING_SORT_APR,
                sortOrder: SortOrder.SORT_DESC,
            });

            const result = handler.getFilteredStakingFarms(request);

            expect(result.stakingFarms).toHaveLength(2);
            // STAKING_1 has APR=50, STAKING_2 has APR=30 but rewards ended
            // Rewards-ended farms should be last regardless of APR
            expect(result.stakingFarms[0].address).toBe(TEST_ADDRESSES.STAKING_1);
            expect(result.stakingFarms[1].address).toBe(TEST_ADDRESSES.STAKING_2);
        });

        it('should place farms with rewardsEnded=true last', () => {
            // Add a third farm with higher APR but rewards ended
            const mockStaking3 = createMockStakingFarm(TEST_ADDRESSES.STAKING_3, {
                farmingTokenId: TEST_TOKEN_IDS.RIDE,
                apr: '80',
                stakedValueUSD: '10000000',
                isProducingRewards: false,
            });
            stateStore.setStakingFarm(TEST_ADDRESSES.STAKING_3, mockStaking3);

            const request = createFilterRequest({
                sortField: StakingFarmSortField.STAKING_SORT_APR,
                sortOrder: SortOrder.SORT_DESC,
            });

            const result = handler.getFilteredStakingFarms(request);

            expect(result.stakingFarms).toHaveLength(3);
            // STAKING_1 (APR=50, producing) should be first
            // STAKING_3 (APR=80, not producing) and STAKING_2 (APR=30, not producing) should be last
            expect(result.stakingFarms[0].address).toBe(TEST_ADDRESSES.STAKING_1);
            expect(result.stakingFarms[0].isProducingRewards).toBe(true);
            // Among ended farms, STAKING_3 should be before STAKING_2 (higher APR)
            expect(result.stakingFarms[1].address).toBe(TEST_ADDRESSES.STAKING_3);
            expect(result.stakingFarms[2].address).toBe(TEST_ADDRESSES.STAKING_2);
        });

        it('should handle STAKING_SORT_UNSPECIFIED', () => {
            const request = createFilterRequest({
                sortField: StakingFarmSortField.STAKING_SORT_UNSPECIFIED,
            });

            const result = handler.getFilteredStakingFarms(request);

            expect(result.stakingFarms).toHaveLength(2);
        });

        it('should paginate results', () => {
            const request = createFilterRequest({
                offset: 1,
                limit: 1,
            });

            const result = handler.getFilteredStakingFarms(request);

            expect(result.stakingFarms).toHaveLength(1);
            expect(result.count).toBe(2); // Total count should be 2
        });
    });

    describe('updateStakingFarms', () => {
        it('should update mutable fields correctly', () => {
            const request = {
                stakingFarms: [
                    {
                        address: TEST_ADDRESSES.STAKING_1,
                        apr: '60',
                    } as any,
                ],
                updateMask: {
                    paths: ['apr'],
                },
            };

            const response = handler.updateStakingFarms(request);

            expect(response.updatedCount).toBe(1);
            expect(response.failedAddresses).toHaveLength(0);

            const farm = stateStore.stakingFarms.get(TEST_ADDRESSES.STAKING_1);
            expect(farm.apr).toBe('60');
        });

        it('should skip immutable field updates', () => {
            const originalFarmingTokenId = TEST_TOKEN_IDS.RIDE;
            const originalRewardTokenId = stateStore.stakingFarms.get(TEST_ADDRESSES.STAKING_1).rewardTokenId;

            const request = {
                stakingFarms: [
                    {
                        address: TEST_ADDRESSES.STAKING_1,
                        farmingTokenId: 'NEWTOKEN-123456',
                        rewardTokenId: 'NEWREWARD-123456',
                        apr: '60',
                    } as any,
                ],
                updateMask: {
                    paths: ['farmingTokenId', 'rewardTokenId', 'apr'],
                },
            };

            handler.updateStakingFarms(request);

            const farm = stateStore.stakingFarms.get(TEST_ADDRESSES.STAKING_1);
            expect(farm.farmingTokenId).toBe(originalFarmingTokenId); // Should not change
            expect(farm.rewardTokenId).toBe(originalRewardTokenId); // Should not change
            expect(farm.apr).toBe('60'); // Should change
        });

        it('should return failedAddresses for non-existent farms', () => {
            const unknownAddress = 'erd1qqqqqqqqqqqqqunknown';

            const request = {
                stakingFarms: [
                    {
                        address: unknownAddress,
                        apr: '60',
                    } as any,
                ],
                updateMask: {
                    paths: ['apr'],
                },
            };

            const response = handler.updateStakingFarms(request);

            expect(response.updatedCount).toBe(0);
            expect(response.failedAddresses).toHaveLength(1);
            expect(response.failedAddresses[0]).toBe(unknownAddress);
        });

        it('should call compute service for each updated farm', () => {
            const computeSpy = jest.spyOn(computeService, 'computeMissingStakingFarmFields');

            const request = {
                stakingFarms: [
                    {
                        address: TEST_ADDRESSES.STAKING_1,
                        apr: '60',
                    } as any,
                    {
                        address: TEST_ADDRESSES.STAKING_2,
                        apr: '40',
                    } as any,
                ],
                updateMask: {
                    paths: ['apr'],
                },
            };

            handler.updateStakingFarms(request);

            expect(computeSpy).toHaveBeenCalledTimes(2);
        });

        it('should update linked pair dualFarmBaseAPR and dualFarmBoostedAPR', () => {
            // Mock compute service to return specific APR values
            jest.spyOn(computeService, 'computeMissingStakingFarmFields').mockImplementation((farm) => ({
                ...farm,
                baseApr: '35',
                maxBoostedApr: '120',
            }));

            const request = {
                stakingFarms: [
                    {
                        address: TEST_ADDRESSES.STAKING_1,
                        apr: '60',
                    } as any,
                ],
                updateMask: {
                    paths: ['apr'],
                },
            };

            handler.updateStakingFarms(request);

            const pair = stateStore.pairs.get(TEST_ADDRESSES.PAIR_EGLD_MEX);
            expect(pair.compoundedAPR.dualFarmBaseAPR).toBe('35');
            expect(pair.compoundedAPR.dualFarmBoostedAPR).toBe('120');
        });

        it('should skip pair update when stakingFarmsPairs mapping missing', () => {
            // Remove staking farm-pair mapping
            stateStore.stakingFarmsPairs.delete(TEST_ADDRESSES.STAKING_1);

            const originalPair = { ...stateStore.pairs.get(TEST_ADDRESSES.PAIR_EGLD_MEX) };

            const request = {
                stakingFarms: [
                    {
                        address: TEST_ADDRESSES.STAKING_1,
                        apr: '60',
                    } as any,
                ],
                updateMask: {
                    paths: ['apr'],
                },
            };

            handler.updateStakingFarms(request);

            // Pair should not be updated
            const pair = stateStore.pairs.get(TEST_ADDRESSES.PAIR_EGLD_MEX);
            expect(pair.compoundedAPR.dualFarmBaseAPR).toBe(originalPair.compoundedAPR.dualFarmBaseAPR);
            expect(pair.compoundedAPR.dualFarmBoostedAPR).toBe(originalPair.compoundedAPR.dualFarmBoostedAPR);
        });

        it('should skip pair update when pair not found in store', () => {
            // Remove pair from store but keep mapping
            stateStore.pairs.delete(TEST_ADDRESSES.PAIR_EGLD_MEX);

            const request = {
                stakingFarms: [
                    {
                        address: TEST_ADDRESSES.STAKING_1,
                        apr: '60',
                    } as any,
                ],
                updateMask: {
                    paths: ['apr'],
                },
            };

            // Should not throw error
            expect(() => handler.updateStakingFarms(request)).not.toThrow();

            const response = handler.updateStakingFarms(request);
            expect(response.updatedCount).toBe(1);
        });

        it('should skip farms with missing address', () => {
            const request = {
                stakingFarms: [
                    {
                        address: undefined,
                        apr: '60',
                    } as any,
                    {
                        address: TEST_ADDRESSES.STAKING_1,
                        apr: '70',
                    } as any,
                ],
                updateMask: {
                    paths: ['apr'],
                },
            };

            const response = handler.updateStakingFarms(request);

            expect(response.updatedCount).toBe(1); // Only 1 succeeded
            expect(response.failedAddresses).toHaveLength(0); // Missing address not added to failed
        });
    });

    describe('getStakingProxies', () => {
        it('should throw error when staking proxy not found', () => {
            const unknownAddress = 'erd1qqqqqqqqqqqqqunknown';

            expect(() => handler.getStakingProxies([unknownAddress])).toThrow(
                `Staking proxy ${unknownAddress} not found`,
            );
        });

        it('should return full staking proxies when fields not specified', () => {
            const result = handler.getStakingProxies([TEST_ADDRESSES.STAKING_PROXY_1]);

            expect(result).toBeDefined();
            expect(result.stakingProxies).toHaveLength(1);
            expect(result.stakingProxies[0].address).toBe(TEST_ADDRESSES.STAKING_PROXY_1);
        });

        it('should handle multiple staking proxies', () => {
            const result = handler.getStakingProxies([
                TEST_ADDRESSES.STAKING_PROXY_1,
                TEST_ADDRESSES.STAKING_PROXY_2,
            ]);

            expect(result).toBeDefined();
            expect(result.stakingProxies).toHaveLength(2);
            expect(result.stakingProxies[0].address).toBe(TEST_ADDRESSES.STAKING_PROXY_1);
            expect(result.stakingProxies[1].address).toBe(TEST_ADDRESSES.STAKING_PROXY_2);
        });
    });

    describe('getAllStakingProxies', () => {
        it('should return empty array when no staking proxies exist', () => {
            stateStore.clearAll();

            const result = handler.getAllStakingProxies();

            expect(result).toBeDefined();
            expect(result.stakingProxies).toHaveLength(0);
        });

        it('should return all staking proxies when they exist', () => {
            const result = handler.getAllStakingProxies();

            expect(result).toBeDefined();
            expect(result.stakingProxies).toHaveLength(2);
        });
    });
});
