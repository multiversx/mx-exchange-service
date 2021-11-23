import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from '../../../services/context/context.service';
import { PairService } from '../../pair/services/pair.service';
import { FarmStatisticsService } from '../services/farm-statistics.service';
import { ContextServiceMock } from '../../../services/context/mocks/context.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmGetterService } from '../services/farm.getter.service';
import { FarmGetterServiceMock } from '../mocks/farm.getter.service.mock';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair.getter.service.mock';
import { PriceFeedService } from 'src/services/price-feed/price-feed.service';
import { PriceFeedServiceMock } from 'src/services/price-feed/price.feed.service.mock';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairServiceMock } from 'src/modules/pair/mocks/pair.service.mock';
import { FarmComputeService } from '../services/farm.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';

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

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairServiceProvider = {
        provide: PairService,
        useClass: PairServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const PriceFeedServiceProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                FarmGetterServiceProvider,
                FarmComputeService,
                ContextServiceProvider,
                ContextGetterServiceProvider,
                PairServiceProvider,
                PairGetterServiceProvider,
                PairComputeService,
                PriceFeedServiceProvider,
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
        expect(farmAPR).toEqual('3504000');
    });
});
