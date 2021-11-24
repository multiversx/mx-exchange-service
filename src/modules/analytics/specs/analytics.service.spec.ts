import { Test, TestingModule } from '@nestjs/testing';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { ContextService } from '../../../services/context/context.service';
import { PairService } from '../../pair/services/pair.service';
import { ContextServiceMock } from '../../../services/context/mocks/context.service.mock';
import { PairServiceMock } from '../../pair/mocks/pair.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmGetterService } from '../../farm/services/farm.getter.service';
import { FarmGetterServiceMock } from '../../farm/mocks/farm.getter.service.mock';
import { PairGetterService } from '../../pair/services/pair.getter.service';
import { PairGetterServiceMock } from '../../pair/mocks/pair.getter.service.mock';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';
import { PriceFeedService } from 'src/services/price-feed/price-feed.service';
import { PriceFeedServiceMock } from 'src/services/price-feed/price.feed.service.mock';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from 'src/services/elrond-communication/elrond.api.service.mock';
import { AWSModule } from 'src/services/aws/aws.module';
import { AnalyticsComputeService } from '../services/analytics.compute.service';

describe('AnalyticsService', () => {
    let service: AnalyticsComputeService;

    const FarmGetterServiceProvider = {
        provide: FarmGetterService,
        useClass: FarmGetterServiceMock,
    };

    const PairServiceProvider = {
        provide: PairService,
        useClass: PairServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
    };

    const ElrondProxyServiceProvider = {
        provide: ElrondProxyService,
        useClass: ElrondProxyServiceMock,
    };

    const PriceFeedServiceProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule, AWSModule],
            providers: [
                ContextServiceProvider,
                ElrondProxyServiceProvider,
                ElrondApiServiceProvider,
                FarmGetterServiceProvider,
                PairServiceProvider,
                PairGetterServiceProvider,
                PairComputeService,
                PriceFeedServiceProvider,
                AnalyticsComputeService,
            ],
        }).compile();

        service = module.get<AnalyticsComputeService>(AnalyticsComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get total value locked in farms', async () => {
        const totalLockedValueUSDFarms = await service.computeLockedValueUSDFarms();
        expect(totalLockedValueUSDFarms.toString()).toEqual('450');
    });
});
