import { WeekTimekeepingComputeService } from '../services/week-timekeeping.compute.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../../../services/caching/cache.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { WeekTimekeepingGetterServiceMock } from '../mocks/week-timekeeping.getter.service.mock';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { WeekTimekeepingGetterService } from '../services/week-timekeeping.getter.service';
import { ErrInvalidWeek } from '../errors';

describe('WeekTimekeepingComputeService', () => {
    let service: WeekTimekeepingComputeService;
    const dummyScAddress = 'erd'
    let weekTimekeepingGetterServiceMock;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [ElrondCommunicationModule, CachingModule],
            providers: [
                ApiConfigService,
                {
                    provide: WeekTimekeepingGetterService,
                    useValue: weekTimekeepingGetterServiceMock,
                },
                WeekTimekeepingComputeService
            ],
        }).compile();

        service = module.get<WeekTimekeepingComputeService>(WeekTimekeepingComputeService);
    });

    describe('init service', () => {
        weekTimekeepingGetterServiceMock = new WeekTimekeepingGetterServiceMock()
        it('should be defined', () => {
            expect(service).toBeDefined();
        });
    })


    describe('init service', () => {
        weekTimekeepingGetterServiceMock = new WeekTimekeepingGetterServiceMock({
            getFirstWeekStartEpochCalled(scAddress: string): Promise<number> {
                return Promise.resolve(250);
            },
        })
        it('week < 0 should error', async () => {
            await expect(service.computeStartEpochForWeek(dummyScAddress, -1)).rejects.toThrowError(ErrInvalidWeek);
        });
        it('week = 0 should error', async () => {
            await expect(service.computeStartEpochForWeek(dummyScAddress, 0)).rejects.toThrowError(ErrInvalidWeek);
        });
        it('week == 1 should return firstWeekStartEpoch', async () => {
            expect(await service.computeStartEpochForWeek(dummyScAddress, 1)).toEqual(service.firstWeekStartEpoch);
        });
        it('should return good value', async () => {
            expect(await service.computeStartEpochForWeek(dummyScAddress, 2)).toEqual(257);
        });
    })
});