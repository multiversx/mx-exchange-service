import { WeekTimekeepingComputeService } from '../services/week-timekeeping.compute.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../../../services/caching/cache.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import {
    WeekTimekeepingGetterHandlers,
    WeekTimekeepingGetterServiceMock
} from '../mocks/week-timekeeping.getter.service.mock';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { WeekTimekeepingGetterService } from '../services/week-timekeeping.getter.service';
import { ErrInvalidEpochLowerThanFirstWeekStartEpoch, ErrInvalidWeek } from '../errors';

describe('WeekTimekeepingComputeService', () => {
    const dummyScAddress = 'erd'
    const expectedErr = new Error('expected err')
    it('init service; should be defined', async () => {
        const service = await createService({});
        expect(service).toBeDefined();
    });

    it('checkAndSetFirstWeekStartEpoch' +
        'getFirstWeekStartEpoch throws error should error', async () => {

        const service = await createService({
            getFirstWeekStartEpoch: scAddress => {
                throw expectedErr;
            },
        })
        await expect(service.computeWeekForEpoch(dummyScAddress, 10))
            .rejects
            .toThrowError(expectedErr);
    });
    it('checkAndSetFirstWeekStartEpoch' +
        'checkAndSetFirstWeekStartEpoch should not call getFirstWeekStartEpoch twice', async () => {
        const firstWeekStartEpoch = 50;
        let increment = 0
        const service = await createService({
            getFirstWeekStartEpoch: scAddress => {
                if (increment > 0) throw expectedErr
                increment++
                return Promise.resolve(firstWeekStartEpoch);
            },
        })
        await expect(service.computeWeekForEpoch(
            dummyScAddress,
            firstWeekStartEpoch,
        ))
            .resolves.toEqual(1);
        await expect(service.computeWeekForEpoch(
            dummyScAddress,
            firstWeekStartEpoch,
        ))
            .resolves.toEqual(1);
    });
    const firstWeekStartEpoch = 250;
    it('computeWeekForEpoch', async () => {
        const service = await createService({
            getFirstWeekStartEpoch: scAddress => {
                return Promise.resolve(firstWeekStartEpoch);
            },
        })
        // epoch < firstWeekStartEpoch should erro
        await expect(service.computeWeekForEpoch(dummyScAddress, firstWeekStartEpoch - 1))
            .rejects
            .toThrowError(ErrInvalidEpochLowerThanFirstWeekStartEpoch);
        // epoch == firstWeekStartEpoch
        expect(
            await service.computeWeekForEpoch(
                dummyScAddress,
                firstWeekStartEpoch,
            ),
        ).toEqual(1);
        // epoch == firstWeekStartEpoch + epochsInWeek - 1
        expect(
            await service.computeWeekForEpoch(
                dummyScAddress,
                firstWeekStartEpoch + service.epochsInWeek - 1,
            ),
        ).toEqual(1);
        // epoch == firstWeekStartEpoch + epochsInWeek
        expect(
            await service.computeWeekForEpoch(
                dummyScAddress,
                firstWeekStartEpoch + service.epochsInWeek,
            ),
        ).toEqual(2);
    });

    it('computeStartEpochForWeek', async () => {
        const service = await createService({
            getFirstWeekStartEpoch: scAddress => {
                return Promise.resolve(250);
            },
        })
        // week < 0 should error
        await expect(service.computeStartEpochForWeek(dummyScAddress, -1)).rejects.toThrowError(ErrInvalidWeek);
        //week = 0 should error
        await expect(service.computeStartEpochForWeek(dummyScAddress, 0)).rejects.toThrowError(ErrInvalidWeek);
        //week == 1 should return firstWeekStartEpoch
        expect(await service.computeStartEpochForWeek(dummyScAddress, 1)).toEqual(service.firstWeekStartEpoch);
        //should return good value
        expect(await service.computeStartEpochForWeek(dummyScAddress, 2)).toEqual(257);
    });
    it('computeEndEpochForWeek', async () => {
        const service = await createService({
            getFirstWeekStartEpoch: scAddress => {
                return Promise.resolve(250);
            },
        })
        // week < 0 should error
        await expect(service.computeEndEpochForWeek(dummyScAddress, -1)).rejects.toThrowError(ErrInvalidWeek);
        // week = 0 should error
        await expect(service.computeEndEpochForWeek(dummyScAddress, 0)).rejects.toThrowError(ErrInvalidWeek);
        // week == 1 should return firstWeekStartEpoch
        expect(await service.computeEndEpochForWeek(dummyScAddress, 1))
                .toEqual(service.firstWeekStartEpoch + service.epochsInWeek - 1);
        // should return good value
        expect(await service.computeEndEpochForWeek(dummyScAddress, 2))
                .toEqual(service.firstWeekStartEpoch + 2 * service.epochsInWeek - 1);
    });
})
;

async function createService(handlers: Partial<WeekTimekeepingGetterHandlers>) {
    const weekTimekeepingGetterServiceMock = new WeekTimekeepingGetterServiceMock(handlers)
    const module: TestingModule = await Test.createTestingModule({
        imports: [ElrondCommunicationModule, CachingModule],
        providers: [
            ApiConfigService,
            {
                provide: WeekTimekeepingGetterService,
                useValue: weekTimekeepingGetterServiceMock,
            },
            WeekTimekeepingComputeService,
        ],
    }).compile();
    return module.get<WeekTimekeepingComputeService>(WeekTimekeepingComputeService);
}