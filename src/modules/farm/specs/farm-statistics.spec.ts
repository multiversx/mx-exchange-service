import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from '../../../services/context/context.service';
import { PairService } from '../../pair/pair.service';
import { FarmStatisticsService } from '../services/farm-statistics.service';
import { PairServiceMock } from '../mocks/farm.test-mocks';
import { ContextServiceMock } from '../../../services/context/context.service.mocks';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmGetterService } from '../services/farm.getter.service';
import { FarmGetterServiceMock } from '../mocks/farm.getter.service.mock';

describe('FarmStatisticsService', () => {
    let service: FarmStatisticsService;

    const FarmGetterServiceProvider = {
        provide: FarmGetterService,
        useClass: FarmGetterServiceMock,
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
                FarmGetterServiceProvider,
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
