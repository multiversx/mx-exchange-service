import { Test, TestingModule } from '@nestjs/testing';
import { CachingService } from '../../services/caching/cache.service';
import { ContextService } from '../../services/context/context.service';
import { PairService } from '../pair/pair.service';
import { FarmStatisticsService } from './farm-statistics.service';
import { FarmService } from './farm.service';
import { FarmServiceMock, PairServiceMock } from './farm.test-mocks';
import { ContextServiceMock } from '../../services/context/context.service.mocks';
import { CommonAppModule } from '../../common.app.module';
import { CachingModule } from '../../services/caching/cache.module';

describe('FarmStatisticsService', () => {
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
            imports: [CommonAppModule, CachingModule],
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
