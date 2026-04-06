import { Test, TestingModule } from '@nestjs/testing';
import { FeesCollectorStateHandler } from '../../services/handlers/fees-collector.state.handler';
import { StateStore } from '../../services/state.store';
import { FeesCollectorComputeService } from '../../services/compute/fees-collector.compute.service';
import { MockFeesCollectorComputeServiceProvider } from '../mocks/compute.services.mock';
import {
    createMockFeesCollector,
    createMockWeekTimekeeping,
    TEST_ADDRESSES,
} from '../test.utils';

describe('FeesCollectorStateHandler', () => {
    let handler: FeesCollectorStateHandler;
    let stateStore: StateStore;
    let computeService: FeesCollectorComputeService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeesCollectorStateHandler,
                StateStore,
                MockFeesCollectorComputeServiceProvider,
            ],
        }).compile();

        handler = module.get<FeesCollectorStateHandler>(
            FeesCollectorStateHandler,
        );
        stateStore = module.get<StateStore>(StateStore);
        computeService = module.get<FeesCollectorComputeService>(
            FeesCollectorComputeService,
        );
    });

    describe('getFeesCollector', () => {
        it('should throw error when fees collector not initialized', () => {
            // State store is empty by default
            expect(() => handler.getFeesCollector()).toThrow(
                'Fees collector not initialized',
            );
        });

        it('should return full fees collector when fields not specified', () => {
            const mockFeesCollector = createMockFeesCollector({
                address: TEST_ADDRESSES.FEES_COLLECTOR,
                lastGlobalUpdateWeek: 99,
                startWeek: 1,
                endWeek: 100,
            });
            stateStore.setFeesCollector(mockFeesCollector);

            const result = handler.getFeesCollector();

            expect(result).toBeDefined();
            expect(result.address).toBe(TEST_ADDRESSES.FEES_COLLECTOR);
            expect(result.lastGlobalUpdateWeek).toBe(99);
            expect(result.startWeek).toBe(1);
            expect(result.endWeek).toBe(100);
            expect(result.time).toBeDefined();
        });

        it('should return full fees collector when fields is empty array', () => {
            const mockFeesCollector = createMockFeesCollector({
                address: TEST_ADDRESSES.FEES_COLLECTOR,
                lastGlobalUpdateWeek: 99,
            });
            stateStore.setFeesCollector(mockFeesCollector);

            const result = handler.getFeesCollector([]);

            expect(result).toBeDefined();
            expect(result.address).toBe(TEST_ADDRESSES.FEES_COLLECTOR);
            expect(result.lastGlobalUpdateWeek).toBe(99);
            expect(result.time).toBeDefined();
        });

        it('should return partial fees collector with only requested field', () => {
            const mockFeesCollector = createMockFeesCollector({
                address: TEST_ADDRESSES.FEES_COLLECTOR,
                lastGlobalUpdateWeek: 99,
                startWeek: 1,
            });
            stateStore.setFeesCollector(mockFeesCollector);

            const result = handler.getFeesCollector(['lastGlobalUpdateWeek']);

            expect(result).toBeDefined();
            expect(result.lastGlobalUpdateWeek).toBe(99);
            expect(result.address).toBeUndefined();
            expect(result.startWeek).toBeUndefined();
        });

        it('should return partial fees collector with multiple requested fields', () => {
            const mockFeesCollector = createMockFeesCollector({
                address: TEST_ADDRESSES.FEES_COLLECTOR,
                lastGlobalUpdateWeek: 99,
                startWeek: 1,
            });
            stateStore.setFeesCollector(mockFeesCollector);

            const result = handler.getFeesCollector([
                'address',
                'lastGlobalUpdateWeek',
            ]);

            expect(result).toBeDefined();
            expect(result.address).toBe(TEST_ADDRESSES.FEES_COLLECTOR);
            expect(result.lastGlobalUpdateWeek).toBe(99);
            expect(result.startWeek).toBeUndefined();
        });
    });

    describe('updateFeesCollector', () => {
        beforeEach(() => {
            const mockFeesCollector = createMockFeesCollector({
                address: TEST_ADDRESSES.FEES_COLLECTOR,
                lastGlobalUpdateWeek: 99,
                lockedTokensPerBlock: '1000000',
                allowExternalClaimRewards: false,
            });
            stateStore.setFeesCollector(mockFeesCollector);
        });

        it('should update mutable fields correctly', () => {
            const request = {
                feesCollector: {
                    lastGlobalUpdateWeek: 100,
                    lockedTokensPerBlock: '2000000',
                } as any,
                updateMask: {
                    paths: ['lastGlobalUpdateWeek', 'lockedTokensPerBlock'],
                },
            };

            handler.updateFeesCollector(request);

            const result = stateStore.feesCollector;
            expect(result.lastGlobalUpdateWeek).toBe(100);
            expect(result.lockedTokensPerBlock).toBe('2000000');
        });

        it('should skip address field updates (immutable)', () => {
            const originalAddress = TEST_ADDRESSES.FEES_COLLECTOR;
            const newAddress = 'erd1qqqqqqqqqqqqqpqnew';

            const request = {
                feesCollector: {
                    address: newAddress,
                    lastGlobalUpdateWeek: 100,
                } as any,
                updateMask: {
                    paths: ['address', 'lastGlobalUpdateWeek'],
                },
            };

            handler.updateFeesCollector(request);

            const result = stateStore.feesCollector;
            expect(result.address).toBe(originalAddress); // Should not change
            expect(result.lastGlobalUpdateWeek).toBe(100); // Should change
        });

        it('should skip fields with undefined values', () => {
            const request = {
                feesCollector: {
                    lastGlobalUpdateWeek: 100,
                    lockedTokensPerBlock: undefined,
                } as any,
                updateMask: {
                    paths: ['lastGlobalUpdateWeek', 'lockedTokensPerBlock'],
                },
            };

            handler.updateFeesCollector(request);

            const result = stateStore.feesCollector;
            expect(result.lastGlobalUpdateWeek).toBe(100); // Should change
            expect(result.lockedTokensPerBlock).toBe('1000000'); // Should not change
        });

        it('should call compute service after updates', () => {
            const computeSpy = jest.spyOn(
                computeService,
                'computeMissingFeesCollectorFields',
            );

            const request = {
                feesCollector: {
                    lastGlobalUpdateWeek: 100,
                } as any,
                updateMask: {
                    paths: ['lastGlobalUpdateWeek'],
                },
            };

            handler.updateFeesCollector(request);

            expect(computeSpy).toHaveBeenCalledTimes(1);
            expect(computeSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    lastGlobalUpdateWeek: 100,
                }),
            );
        });

        it('should store complete fees collector after compute', () => {
            const mockTime = createMockWeekTimekeeping({
                currentWeek: 101,
            });

            // Mock compute service to return updated time
            jest.spyOn(
                computeService,
                'computeMissingFeesCollectorFields',
            ).mockReturnValue({
                ...stateStore.feesCollector,
                lastGlobalUpdateWeek: 100,
                time: mockTime,
            });

            const request = {
                feesCollector: {
                    lastGlobalUpdateWeek: 100,
                } as any,
                updateMask: {
                    paths: ['lastGlobalUpdateWeek'],
                },
            };

            handler.updateFeesCollector(request);

            const result = stateStore.feesCollector;
            expect(result.lastGlobalUpdateWeek).toBe(100);
            expect(result.time).toEqual(mockTime);
        });
    });
});
