import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../pair/pair.service';
import { ContextService } from '../utils/context.service';
import { FarmStatisticsService } from './farm-statistics.service';
import { FarmService } from './farm.service';
import {
    ContextServiceMock,
    FarmServiceMock,
    PairServiceMock,
} from './farm.test-mocks';

describe('PairService', () => {
    let service: FarmStatisticsService;

    const FarmServiceProvider = {
        provide: FarmService,
        useClass: FarmServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const PairServiceProvider = {
        provide: PairService,
        useClass: PairServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FarmServiceProvider,
                ContextServiceProvider,
                PairServiceProvider,
                FarmStatisticsService,
            ],
        }).compile();

        service = module.get<FarmStatisticsService>(FarmStatisticsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get farmAPR', async () => {
        const farmAPR = await service.computeFarmAPR('farm_address_1');
        expect(farmAPR).toEqual('2.628');
    });
});
