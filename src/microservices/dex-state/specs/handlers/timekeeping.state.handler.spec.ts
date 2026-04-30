import { Test, TestingModule } from '@nestjs/testing';
import { TimekeepingStateHandler } from '../../services/handlers/timekeeping.state.handler';
import { StateStore } from '../../services/state.store';
import {
    createMockFarm,
    createMockStakingFarm,
    createMockFeesCollector,
    createMockWeekTimekeeping,
    TEST_ADDRESSES,
} from '../test.utils';

describe('TimekeepingStateHandler', () => {
    let handler: TimekeepingStateHandler;
    let stateStore: StateStore;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TimekeepingStateHandler, StateStore],
        }).compile();

        handler = module.get<TimekeepingStateHandler>(TimekeepingStateHandler);
        stateStore = module.get<StateStore>(StateStore);

        // Populate state store with test data
        const mockFarmTime = createMockWeekTimekeeping({
            currentWeek: 100,
            startEpochForWeek: 1000,
        });
        const mockFarm = createMockFarm(TEST_ADDRESSES.FARM_1, {
            time: mockFarmTime,
        });
        stateStore.setFarm(TEST_ADDRESSES.FARM_1, mockFarm);

        const mockStakingTime = createMockWeekTimekeeping({
            currentWeek: 101,
            startEpochForWeek: 1010,
        });
        const mockStaking = createMockStakingFarm(TEST_ADDRESSES.STAKING_1, {
            time: mockStakingTime,
        });
        stateStore.setStakingFarm(TEST_ADDRESSES.STAKING_1, mockStaking);

        const mockFeesCollectorTime = createMockWeekTimekeeping({
            currentWeek: 102,
            startEpochForWeek: 1020,
        });
        const mockFeesCollector = createMockFeesCollector({
            address: TEST_ADDRESSES.FEES_COLLECTOR,
            time: mockFeesCollectorTime,
        });
        stateStore.setFeesCollector(mockFeesCollector);
    });

    describe('getWeeklyTimekeeping', () => {
        it('should throw error when address is missing', () => {
            const request = {
                address: undefined,
                fields: { paths: [] },
            };

            expect(() => handler.getWeeklyTimekeeping(request)).toThrow(
                'SC Address missing',
            );
        });

        it('should return farm time when address matches a farm', () => {
            const request = {
                address: TEST_ADDRESSES.FARM_1,
                fields: { paths: [] },
            };

            const result = handler.getWeeklyTimekeeping(request);

            expect(result).toBeDefined();
            expect(result.currentWeek).toBe(100);
            expect(result.startEpochForWeek).toBe(1000);
        });

        it('should return staking farm time when address matches a staking farm', () => {
            const request = {
                address: TEST_ADDRESSES.STAKING_1,
                fields: { paths: [] },
            };

            const result = handler.getWeeklyTimekeeping(request);

            expect(result).toBeDefined();
            expect(result.currentWeek).toBe(101);
            expect(result.startEpochForWeek).toBe(1010);
        });

        it('should return fees collector time when address matches fees collector', () => {
            const request = {
                address: TEST_ADDRESSES.FEES_COLLECTOR,
                fields: { paths: [] },
            };

            const result = handler.getWeeklyTimekeeping(request);

            expect(result).toBeDefined();
            expect(result.currentWeek).toBe(102);
            expect(result.startEpochForWeek).toBe(1020);
        });

        it('should throw error when address is not found', () => {
            const unknownAddress = 'erd1qqqqqqqqqqqqqunknown';
            const request = {
                address: unknownAddress,
                fields: { paths: [] },
            };

            expect(() => handler.getWeeklyTimekeeping(request)).toThrow(
                `Could not find time for SC ${unknownAddress}`,
            );
        });

        it('should return full time object when fields are not specified', () => {
            const request = {
                address: TEST_ADDRESSES.FARM_1,
                fields: { paths: [] },
            };

            const result = handler.getWeeklyTimekeeping(request);

            expect(result).toBeDefined();
            expect(result.currentWeek).toBe(100);
            expect(result.startEpochForWeek).toBe(1000);
            expect(result.endEpochForWeek).toBeDefined();
            expect(result.firstWeekStartEpoch).toBeDefined();
        });

        it('should return partial time object with only requested field', () => {
            const request = {
                address: TEST_ADDRESSES.FARM_1,
                fields: {
                    paths: ['currentWeek'],
                },
            };

            const result = handler.getWeeklyTimekeeping(request);

            expect(result).toBeDefined();
            expect(result.currentWeek).toBe(100);
            expect(result.startEpochForWeek).toBeUndefined();
            expect(result.endEpochForWeek).toBeUndefined();
        });

        it('should return partial time object with multiple requested fields', () => {
            const request = {
                address: TEST_ADDRESSES.FARM_1,
                fields: {
                    paths: ['currentWeek', 'startEpochForWeek', 'endEpochForWeek'],
                },
            };

            const result = handler.getWeeklyTimekeeping(request);

            expect(result).toBeDefined();
            expect(result.currentWeek).toBe(100);
            expect(result.startEpochForWeek).toBe(1000);
            expect(result.endEpochForWeek).toBeDefined();
            // Fields not requested should be undefined
            expect(result.firstWeekStartEpoch).toBeUndefined();
        });
    });
});
