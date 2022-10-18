import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../../../services/caching/cache.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { WeekTimekeepingGetterServiceMock } from '../mocks/week-timekeeping.getter.service.mock';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { WeekTimekeepingGetterService } from '../services/week-timekeeping.getter.service';
import { WeekTimekeepingService } from '../services/week-timekeeping.service';
import { WeekForEpochModel, WeekTimekeepingModel } from '../models/week-timekeeping.model';

describe('WeekTimekeepingService', () => {
    const dummyScAddress = 'erd'
    const expectedErr = new Error('expected err')
    it('init service; should be defined', async () => {
        const service = await createService({});
        expect(service).toBeDefined();
    });
    it('getWeeklyTimekeeping' +
        'getCurrentWeek throws error should error', async () => {
        const service = await createService({
            getCurrentWeek: scAddress => {
                throw expectedErr;
            },
        })
        await expect(service.getWeeklyTimekeeping(dummyScAddress))
            .rejects
            .toThrowError(expectedErr);
    });
    it('getWeeklyTimekeeping' +
        'should work', async () => {
        const expectedScAddress = "expectedErd";
        const expectedCurrentWeek = 10;
        const service = await createService({
            getCurrentWeek: scAddress => {
                expect(scAddress === expectedScAddress);
                return Promise.resolve(expectedCurrentWeek);
            },
        })
        expect(await service.getWeeklyTimekeeping(expectedScAddress))
            .toEqual(
                new WeekTimekeepingModel({
                    scAddress: expectedScAddress,
                    currentWeek: expectedCurrentWeek,
                })
            )
    });
    it('getWeekForEpoch' +
        'should work', async () => {
        const expectedScAddress = "expectedErd";
        const expectedEpoch = 10;
        const service = await createService({})
        expect(await service.getWeekForEpoch(expectedScAddress, expectedEpoch))
            .toEqual(
                new WeekForEpochModel({
                    scAddress: expectedScAddress,
                    epoch: expectedEpoch,
                })
            )
    });
})
;

async function createService(handlers: any) {
    const weekTimekeepingGetterServiceMock = new WeekTimekeepingGetterServiceMock(handlers)
    const module: TestingModule = await Test.createTestingModule({
        imports: [ElrondCommunicationModule, CachingModule],
        providers: [
            ApiConfigService,
            {
                provide: WeekTimekeepingGetterService,
                useValue: weekTimekeepingGetterServiceMock,
            },
            WeekTimekeepingService,
        ],
    }).compile();
    return module.get<WeekTimekeepingService>(WeekTimekeepingService);
}