import { Test, TestingModule } from '@nestjs/testing';
import { FarmsStateHandler } from '../../services/handlers/farms.state.handler';
import { StateStore } from '../../services/state.store';
import { FarmComputeService } from '../../services/compute/farm.compute.service';
import { MockFarmComputeServiceProvider } from '../mocks/compute.services.mock';
import {
    createMockFarm,
    createMockPair,
    TEST_ADDRESSES,
} from '../test.utils';
import { PairCompoundedAPRModel } from 'src/modules/pair/models/pair.compounded.apr.model';

describe('FarmsStateHandler', () => {
    let handler: FarmsStateHandler;
    let stateStore: StateStore;
    let computeService: FarmComputeService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FarmsStateHandler,
                StateStore,
                MockFarmComputeServiceProvider,
            ],
        }).compile();

        handler = module.get<FarmsStateHandler>(FarmsStateHandler);
        stateStore = module.get<StateStore>(StateStore);
        computeService = module.get<FarmComputeService>(FarmComputeService);

        // Populate state store with test farms
        const mockFarm1 = createMockFarm(TEST_ADDRESSES.FARM_1, {
            pairAddress: TEST_ADDRESSES.PAIR_EGLD_MEX,
            baseApr: '50',
            boostedApr: '100',
            farmedTokenId: 'MEX-123456',
            farmingTokenId: 'EGLDMEX-abcdef',
        });
        stateStore.setFarm(TEST_ADDRESSES.FARM_1, mockFarm1);

        const mockFarm2 = createMockFarm(TEST_ADDRESSES.FARM_2, {
            pairAddress: TEST_ADDRESSES.PAIR_EGLD_USDC,
            baseApr: '30',
            boostedApr: '60',
        });
        stateStore.setFarm(TEST_ADDRESSES.FARM_2, mockFarm2);

        // Set up farm-pair mapping
        stateStore.farmsPairs.set(TEST_ADDRESSES.FARM_1, TEST_ADDRESSES.PAIR_EGLD_MEX);
        stateStore.farmsPairs.set(TEST_ADDRESSES.FARM_2, TEST_ADDRESSES.PAIR_EGLD_USDC);

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
    });

    describe('getFarms', () => {
        it('should throw error when farm not found', () => {
            const unknownAddress = 'erd1qqqqqqqqqqqqqunknown';

            expect(() => handler.getFarms([unknownAddress])).toThrow(
                `Farm ${unknownAddress} not found`,
            );
        });

        it('should return full farms when fields not specified', () => {
            const result = handler.getFarms([TEST_ADDRESSES.FARM_1]);

            expect(result).toBeDefined();
            expect(result.farms).toHaveLength(1);
            expect(result.farms[0].address).toBe(TEST_ADDRESSES.FARM_1);
            expect(result.farms[0].baseApr).toBe('50');
            expect(result.farms[0].boostedApr).toBe('100');
            expect(result.farms[0].pairAddress).toBeDefined();
        });

        it('should return partial farms with only requested fields', () => {
            const result = handler.getFarms([TEST_ADDRESSES.FARM_1], ['address', 'baseApr']);

            expect(result).toBeDefined();
            expect(result.farms).toHaveLength(1);
            expect(result.farms[0].address).toBe(TEST_ADDRESSES.FARM_1);
            expect(result.farms[0].baseApr).toBe('50');
            expect(result.farms[0].boostedApr).toBeUndefined();
        });

        it('should handle multiple farms', () => {
            const result = handler.getFarms([
                TEST_ADDRESSES.FARM_1,
                TEST_ADDRESSES.FARM_2,
            ]);

            expect(result).toBeDefined();
            expect(result.farms).toHaveLength(2);
            expect(result.farms[0].address).toBe(TEST_ADDRESSES.FARM_1);
            expect(result.farms[1].address).toBe(TEST_ADDRESSES.FARM_2);
        });
    });

    describe('getAllFarms', () => {
        it('should return empty array when no farms exist', () => {
            stateStore.clearAll();

            const result = handler.getAllFarms();

            expect(result).toBeDefined();
            expect(result.farms).toHaveLength(0);
        });

        it('should return all farms when farms exist', () => {
            const result = handler.getAllFarms();

            expect(result).toBeDefined();
            expect(result.farms).toHaveLength(2);
            expect(result.farms.some(f => f.address === TEST_ADDRESSES.FARM_1)).toBe(true);
            expect(result.farms.some(f => f.address === TEST_ADDRESSES.FARM_2)).toBe(true);
        });
    });

    describe('updateFarms', () => {
        it('should update mutable fields correctly', () => {
            const request = {
                farms: [
                    {
                        address: TEST_ADDRESSES.FARM_1,
                        perSecondRewards: '2000000000000000000',
                    } as any,
                ],
                updateMask: {
                    paths: ['perSecondRewards'],
                },
            };

            const response = handler.updateFarms(request);

            expect(response.updatedCount).toBe(1);
            expect(response.failedAddresses).toHaveLength(0);

            const farm = stateStore.farms.get(TEST_ADDRESSES.FARM_1);
            expect(farm?.perSecondRewards).toBe('2000000000000000000');
        });

        it('should skip immutable field updates', () => {
            const originalFarmedTokenId = 'MEX-123456';
            const originalFarmingTokenId = 'EGLDMEX-abcdef';
            const originalPairAddress = TEST_ADDRESSES.PAIR_EGLD_MEX;

            const request = {
                farms: [
                    {
                        address: TEST_ADDRESSES.FARM_1,
                        farmedTokenId: 'NEWTOKEN-123456',
                        farmingTokenId: 'NEWFARMING-abcdef',
                        pairAddress: 'erd1qqqqqqqqqqqqqnewpair',
                        perSecondRewards: '2000000000000000000',
                    } as any,
                ],
                updateMask: {
                    paths: ['farmedTokenId', 'farmingTokenId', 'pairAddress', 'perSecondRewards'],
                },
            };

            handler.updateFarms(request);

            const farm = stateStore.farms.get(TEST_ADDRESSES.FARM_1);
            expect(farm.farmedTokenId).toBe(originalFarmedTokenId); // Should not change
            expect(farm.farmingTokenId).toBe(originalFarmingTokenId); // Should not change
            expect(farm.pairAddress).toBe(originalPairAddress); // Should not change
            expect(farm?.perSecondRewards).toBe('2000000000000000000'); // Should change
        });

        it('should return failedAddresses for non-existent farms', () => {
            const unknownAddress = 'erd1qqqqqqqqqqqqqunknown';

            const request = {
                farms: [
                    {
                        address: unknownAddress,
                        perBlockRewards: '2000000000000000000',
                    } as any,
                ],
                updateMask: {
                    paths: ['perBlockRewards'],
                },
            };

            const response = handler.updateFarms(request);

            expect(response.updatedCount).toBe(0);
            expect(response.failedAddresses).toHaveLength(1);
            expect(response.failedAddresses[0]).toBe(unknownAddress);
        });

        it('should call compute service for each updated farm', () => {
            const computeSpy = jest.spyOn(computeService, 'computeMissingFarmFields');

            const request = {
                farms: [
                    {
                        address: TEST_ADDRESSES.FARM_1,
                        perBlockRewards: '2000000000000000000',
                    } as any,
                    {
                        address: TEST_ADDRESSES.FARM_2,
                        perBlockRewards: '3000000000000000000',
                    } as any,
                ],
                updateMask: {
                    paths: ['perBlockRewards'],
                },
            };

            handler.updateFarms(request);

            expect(computeSpy).toHaveBeenCalledTimes(2);
        });

        it('should update linked pair farmBaseAPR and farmBoostedAPR', () => {
            // Mock compute service to return specific APR values
            jest.spyOn(computeService, 'computeMissingFarmFields').mockImplementation((farm) => ({
                ...farm,
                baseApr: '75',
                boostedApr: '150',
            }));

            const request = {
                farms: [
                    {
                        address: TEST_ADDRESSES.FARM_1,
                        perBlockRewards: '2000000000000000000',
                    } as any,
                ],
                updateMask: {
                    paths: ['perBlockRewards'],
                },
            };

            handler.updateFarms(request);

            const pair = stateStore.pairs.get(TEST_ADDRESSES.PAIR_EGLD_MEX);
            expect(pair.compoundedAPR.farmBaseAPR).toBe('75');
            expect(pair.compoundedAPR.farmBoostedAPR).toBe('150');
        });

        it('should skip pair update when farmsPairs mapping missing', () => {
            // Remove farm-pair mapping
            stateStore.farmsPairs.delete(TEST_ADDRESSES.FARM_1);

            const originalPair = { ...stateStore.pairs.get(TEST_ADDRESSES.PAIR_EGLD_MEX) };

            const request = {
                farms: [
                    {
                        address: TEST_ADDRESSES.FARM_1,
                        perBlockRewards: '2000000000000000000',
                    } as any,
                ],
                updateMask: {
                    paths: ['perBlockRewards'],
                },
            };

            handler.updateFarms(request);

            // Pair should not be updated
            const pair = stateStore.pairs.get(TEST_ADDRESSES.PAIR_EGLD_MEX);
            expect(pair.compoundedAPR.farmBaseAPR).toBe(originalPair.compoundedAPR.farmBaseAPR);
            expect(pair.compoundedAPR.farmBoostedAPR).toBe(originalPair.compoundedAPR.farmBoostedAPR);
        });

        it('should skip pair update when pair not found in store', () => {
            // Remove pair from store but keep mapping
            stateStore.pairs.delete(TEST_ADDRESSES.PAIR_EGLD_MEX);

            const request = {
                farms: [
                    {
                        address: TEST_ADDRESSES.FARM_1,
                        perBlockRewards: '2000000000000000000',
                    } as any,
                ],
                updateMask: {
                    paths: ['perBlockRewards'],
                },
            };

            // Should not throw error
            expect(() => handler.updateFarms(request)).not.toThrow();

            const response = handler.updateFarms(request);
            expect(response.updatedCount).toBe(1);
        });

        it('should return correct updatedCount', () => {
            const request = {
                farms: [
                    {
                        address: TEST_ADDRESSES.FARM_1,
                        perBlockRewards: '2000000000000000000',
                    } as any,
                    {
                        address: TEST_ADDRESSES.FARM_2,
                        perBlockRewards: '3000000000000000000',
                    } as any,
                    {
                        address: 'erd1qqqqqqqqqqqqqunknown',
                        perBlockRewards: '4000000000000000000',
                    } as any,
                ],
                updateMask: {
                    paths: ['perBlockRewards'],
                },
            };

            const response = handler.updateFarms(request);

            expect(response.updatedCount).toBe(2); // Only 2 succeeded
            expect(response.failedAddresses).toHaveLength(1);
        });

        it('should skip farms with missing address', () => {
            const request = {
                farms: [
                    {
                        address: undefined,
                        perBlockRewards: '2000000000000000000',
                    } as any,
                    {
                        address: TEST_ADDRESSES.FARM_1,
                        perBlockRewards: '3000000000000000000',
                    } as any,
                ],
                updateMask: {
                    paths: ['perBlockRewards'],
                },
            };

            const response = handler.updateFarms(request);

            expect(response.updatedCount).toBe(1); // Only 1 succeeded
            expect(response.failedAddresses).toHaveLength(0); // Missing address not added to failed
        });
    });
});
