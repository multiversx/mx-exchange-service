import { Test, TestingModule } from '@nestjs/testing';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { PairService } from '../../pair/services/pair.service';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmGetterService } from '../../farm/base-module/services/farm.getter.service';
import { FarmGetterServiceMock } from '../../farm/mocks/farm.getter.service.mock';
import { PairGetterService } from '../../pair/services/pair.getter.service';
import { PairGetterServiceMock } from '../../pair/mocks/pair.getter.service.mock';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from 'src/services/elrond-communication/elrond.api.service.mock';
import { AWSModule } from 'src/services/aws/aws.module';
import { AnalyticsComputeService } from '../services/analytics.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { FarmService } from 'src/modules/farm/base-module/services/farm.service';
import { FarmServiceMock } from 'src/modules/farm/mocks/farm.service.mock';
import { LockedAssetGetterService } from 'src/modules/locked-asset-factory/services/locked.asset.getter.service';
import { AbiLockedAssetService } from 'src/modules/locked-asset-factory/services/abi-locked-asset.service';
import { AbiLockedAssetServiceMock } from 'src/modules/locked-asset-factory/mocks/abi.locked.asset.service.mock';
import { ProxyGetterService } from 'src/modules/proxy/services/proxy.getter.service';
import { ProxyGetterServiceMock } from 'src/modules/proxy/mocks/proxy.getter.service.mock';
import { FarmComputeService } from 'src/modules/farm/base-module/services/farm.compute.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.mock';
import { FarmV12ComputeService } from 'src/modules/farm/v1.2/services/farm.v1.2.compute.service';
import { FarmV12GetterServiceProvider } from 'src/modules/farm/mocks/farm.v1.2.getter.service.mock';
import { FarmV13ComputeService } from 'src/modules/farm/v1.3/services/farm.v1.3.compute.service';
import { FarmV13GetterServiceProvider } from 'src/modules/farm/mocks/farm.v1.3.getter.service.mock';

describe('AnalyticsService', () => {
    let service: AnalyticsComputeService;

    const FarmServiceProvider = {
        provide: FarmService,
        useClass: FarmServiceMock,
    };

    const FarmGetterServiceProvider = {
        provide: FarmGetterService,
        useClass: FarmGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const ProxyGetterServiceProvider = {
        provide: ProxyGetterService,
        useClass: ProxyGetterServiceMock,
    };

    const AbiLockedAssetServiceProvider = {
        provide: AbiLockedAssetService,
        useClass: AbiLockedAssetServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
    };

    const ElrondProxyServiceProvider = {
        provide: ElrondProxyService,
        useClass: ElrondProxyServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule, AWSModule],
            providers: [
                ContextGetterServiceProvider,
                ElrondProxyServiceProvider,
                ElrondApiServiceProvider,
                FarmServiceProvider,
                FarmGetterServiceProvider,
                FarmV12GetterServiceProvider,
                FarmV13GetterServiceProvider,
                FarmComputeService,
                FarmV12ComputeService,
                FarmV13ComputeService,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                ProxyGetterServiceProvider,
                AbiLockedAssetServiceProvider,
                LockedAssetGetterService,
                WrapServiceProvider,
                RouterGetterServiceProvider,
                TokenGetterServiceProvider,
                TokenComputeService,
                AnalyticsComputeService,
            ],
        }).compile();

        service = module.get<AnalyticsComputeService>(AnalyticsComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get total value locked in farms', async () => {
        const totalLockedValueUSDFarms =
            await service.computeLockedValueUSDFarms();
        expect(totalLockedValueUSDFarms.toString()).toEqual(
            '32000080010000.0001600006',
        );
    });
});
