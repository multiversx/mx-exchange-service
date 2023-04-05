import { WeekTimekeepingComputeService } from '../services/week-timekeeping.compute.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../../../services/caching/cache.module';
import { MXCommunicationModule } from '../../../services/multiversx-communication/mx.communication.module';
import { ApiConfigService } from '../../../helpers/api.config.service';
import {
    ErrInvalidEpochLowerThanFirstWeekStartEpoch,
    ErrInvalidWeek,
} from '../errors';

describe('WeekTimekeepingComputeService', () => {
    it('init service; should be defined', async () => {
        const service = await createService();
        expect(service).toBeDefined();
    });
    const firstWeekStartEpoch = 250;
    it('computeWeekForEpoch', async () => {
        const service = await createService();
        // epoch < firstWeekStartEpoch should erro
        await expect(
            service.computeWeekForEpoch(
                firstWeekStartEpoch - 1,
                firstWeekStartEpoch,
            ),
        ).rejects.toThrowError(ErrInvalidEpochLowerThanFirstWeekStartEpoch);
        // epoch == firstWeekStartEpoch
        expect(
            await service.computeWeekForEpoch(
                firstWeekStartEpoch,
                firstWeekStartEpoch,
            ),
        ).toEqual(1);
        // epoch == firstWeekStartEpoch + epochsInWeek - 1
        expect(
            await service.computeWeekForEpoch(
                firstWeekStartEpoch + service.epochsInWeek - 1,
                firstWeekStartEpoch,
            ),
        ).toEqual(1);
        // epoch == firstWeekStartEpoch + epochsInWeek
        expect(
            await service.computeWeekForEpoch(
                firstWeekStartEpoch + service.epochsInWeek,
                firstWeekStartEpoch,
            ),
        ).toEqual(2);
    });

    it('computeStartEpochForWeek', async () => {
        const firstWeekStartEpoch = 250;
        const service = await createService();
        // week < 0 should error
        await expect(
            service.computeStartEpochForWeek(-1, firstWeekStartEpoch),
        ).rejects.toThrowError(ErrInvalidWeek);
        //week = 0 should error
        await expect(
            service.computeStartEpochForWeek(0, firstWeekStartEpoch),
        ).rejects.toThrowError(ErrInvalidWeek);
        //week == 1 should return firstWeekStartEpoch
        expect(
            await service.computeStartEpochForWeek(1, firstWeekStartEpoch),
        ).toEqual(firstWeekStartEpoch);
        //should return good value
        expect(
            await service.computeStartEpochForWeek(2, firstWeekStartEpoch),
        ).toEqual(250 + service.epochsInWeek);
    });
    it('computeEndEpochForWeek', async () => {
        const firstWeekStartEpoch = 250;
        const service = await createService();
        // week < 0 should error
        await expect(
            service.computeEndEpochForWeek(-1, firstWeekStartEpoch),
        ).rejects.toThrowError(ErrInvalidWeek);
        // week = 0 should error
        await expect(
            service.computeEndEpochForWeek(0, firstWeekStartEpoch),
        ).rejects.toThrowError(ErrInvalidWeek);
        // week == 1 should return firstWeekStartEpoch
        expect(
            await service.computeEndEpochForWeek(1, firstWeekStartEpoch),
        ).toEqual(firstWeekStartEpoch + service.epochsInWeek - 1);
        // should return good value
        expect(
            await service.computeEndEpochForWeek(2, firstWeekStartEpoch),
        ).toEqual(firstWeekStartEpoch + 2 * service.epochsInWeek - 1);
    });
});

async function createService() {
    const module: TestingModule = await Test.createTestingModule({
        imports: [MXCommunicationModule, CachingModule],
        providers: [ApiConfigService, WeekTimekeepingComputeService],
    }).compile();
    return module.get<WeekTimekeepingComputeService>(
        WeekTimekeepingComputeService,
    );
}
