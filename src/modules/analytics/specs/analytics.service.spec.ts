import { Test, TestingModule } from '@nestjs/testing';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { PairService } from '../../pair/services/pair.service';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { PairGetterService } from '../../pair/services/pair.getter.service';
import { PairGetterServiceStub } from '../../pair/mocks/pair-getter-service-stub.service';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from 'src/services/elrond-communication/elrond.api.service.mock';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { AnalyticsComputeService } from '../services/analytics.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { LockedAssetGetterService } from 'src/modules/locked-asset-factory/services/locked.asset.getter.service';
import { AbiLockedAssetService } from 'src/modules/locked-asset-factory/services/abi-locked-asset.service';
import { AbiLockedAssetServiceMock } from 'src/modules/locked-asset-factory/mocks/abi.locked.asset.service.mock';
import { ProxyGetterService } from 'src/modules/proxy/services/proxy.getter.service';
import { ProxyGetterServiceMock } from 'src/modules/proxy/mocks/proxy.getter.service.mock';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { FarmComputeServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.compute.service';
import { FarmGetterServiceProviderV1_2 } from 'src/modules/farm/mocks/farm.v1.2.getter.service.mock';
import { FarmComputeServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.compute.service';
import { FarmGetterServiceProviderV1_3 } from 'src/modules/farm/mocks/farm.v1.3.getter.service.mock';
import { FarmGetterServiceV2 } from 'src/modules/farm/v2/services/farm.v2.getter.service';
import { FarmGetterServiceMock } from 'src/modules/farm/mocks/farm.getter.service.mock';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { FarmGetterFactory } from 'src/modules/farm/farm.getter.factory';
import { FarmComputeFactory } from 'src/modules/farm/farm.compute.factory';
import { FarmGetterService } from 'src/modules/farm/base-module/services/farm.getter.service';
import {
    WeeklyRewardsSplittingGetterService
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import {
    WeeklyRewardsSplittingGetterServiceMock
} from '../../../submodules/weekly-rewards-splitting/mocks/weekly-rewards-splitting.getter.service.mock';
import {
    WeekTimekeepingGetterService
} from '../../../submodules/week-timekeeping/services/week-timekeeping.getter.service';
import {
    WeekTimekeepingGetterServiceMock
} from '../../../submodules/week-timekeeping/mocks/week-timekeeping.getter.service.mock';
import {
    WeekTimekeepingComputeService
} from '../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
import {
    WeekTimekeepingComputeServiceMock
} from '../../../submodules/week-timekeeping/mocks/week-timekeeping.compute.service.mock';
import { ProgressComputeService } from '../../../submodules/weekly-rewards-splitting/services/progress.compute.service';
import {
    ProgressComputeServiceMock
} from '../../../submodules/weekly-rewards-splitting/mocks/progress.compute.service.mock';
import { EnergyGetterServiceProvider } from '../../energy/mocks/energy.getter.service.mock';
import {
    StakingGetterServiceProvider,
} from '../../staking/mocks/staking.getter.service.mock';
import { AnalyticsGetterServiceProvider } from '../mocks/analytics.getter.service.mock';
import { FeesCollectorGetterServiceMock } from '../../fees-collector/mocks/fees-collector.getter.service.mock';
import { FeesCollectorGetterService } from '../../fees-collector/services/fees-collector.getter.service';
import {
    RemoteConfigGetterServiceProvider
} from '../../remote-config/mocks/remote-config.getter.mock';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { AWSTimestreamQueryService } from 'src/services/analytics/aws/aws.timestream.query';
import { DataApiQueryServiceProvider } from '../mocks/data.api.query.service.mock';

describe('AnalyticsService', () => {
    let service: AnalyticsComputeService;

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
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
        const feesCollectorGetter = new FeesCollectorGetterServiceMock({});
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                CommonAppModule,
                CachingModule,
            ],
            providers: [
                ContextGetterServiceProvider,
                ElrondProxyServiceProvider,
                ElrondApiServiceProvider,
                FarmGetterFactory,
                FarmGetterServiceProviderV1_2,
                FarmGetterServiceProviderV1_3,
                {
                    provide: FarmGetterServiceV2,
                    useClass: FarmGetterServiceMock,
                },
                {
                    provide: FarmGetterService,
                    useClass: FarmGetterServiceMock,
                },
                FarmComputeFactory,
                FarmComputeServiceV1_2,
                FarmComputeServiceV1_3,
                FarmComputeServiceV2,
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
                {
                    provide: WeeklyRewardsSplittingGetterService,
                    useValue: new WeeklyRewardsSplittingGetterServiceMock({}),
                },
                {
                    provide: WeekTimekeepingGetterService,
                    useValue: new WeekTimekeepingGetterServiceMock({}),
                },
                {
                    provide: WeekTimekeepingComputeService,
                    useValue: new WeekTimekeepingComputeServiceMock({}),
                },
                {
                    provide: ProgressComputeService,
                    useValue: new ProgressComputeServiceMock({}),
                },
                EnergyGetterServiceProvider,
                StakingGetterServiceProvider,
                AnalyticsGetterServiceProvider,
                {
                    provide: FeesCollectorGetterService,
                    useValue: feesCollectorGetter,
                },
                RemoteConfigGetterServiceProvider,
                AnalyticsQueryService,
                AWSTimestreamQueryService,
                DataApiQueryServiceProvider
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
