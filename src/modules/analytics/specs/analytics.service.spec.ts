import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { AnalyticsComputeService } from '../services/analytics.compute.service';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { LockedAssetGetterService } from 'src/modules/locked-asset-factory/services/locked.asset.getter.service';
import { AbiLockedAssetService } from 'src/modules/locked-asset-factory/services/abi-locked-asset.service';
import { AbiLockedAssetServiceMock } from 'src/modules/locked-asset-factory/mocks/abi.locked.asset.service.mock';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
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
import { WeekTimekeepingComputeService } from '../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { AnalyticsGetterServiceProvider } from '../mocks/analytics.getter.service.mock';
import { FeesCollectorGetterServiceMock } from '../../fees-collector/mocks/fees-collector.getter.service.mock';
import { FeesCollectorGetterService } from '../../fees-collector/services/fees-collector.getter.service';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { AWSTimestreamQueryService } from 'src/services/analytics/aws/aws.timestream.query';
import { DataApiQueryServiceProvider } from '../mocks/data.api.query.service.mock';
import { RemoteConfigGetterServiceProvider } from '../../remote-config/mocks/remote-config.getter.mock';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { ProxyAbiServiceProvider } from 'src/modules/proxy/mocks/proxy.abi.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { StakingAbiServiceProvider } from 'src/modules/staking/mocks/staking.abi.service.mock';
import { StakingService } from 'src/modules/staking/services/staking.service';
import { StakingComputeService } from 'src/modules/staking/services/staking.compute.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';

describe('AnalyticsService', () => {
    let service: AnalyticsComputeService;

    beforeEach(async () => {
        const feesCollectorGetter = new FeesCollectorGetterServiceMock({});
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                ContextGetterServiceProvider,
                MXProxyServiceProvider,
                MXApiServiceProvider,
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
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairComputeService,
                ProxyAbiServiceProvider,
                {
                    provide: AbiLockedAssetService,
                    useClass: AbiLockedAssetServiceMock,
                },
                LockedAssetGetterService,
                WrapAbiServiceProvider,
                RouterAbiServiceProvider,
                TokenGetterServiceProvider,
                TokenComputeService,
                MXDataApiServiceProvider,
                AnalyticsComputeService,
                WeekTimekeepingComputeService,
                WeekTimekeepingAbiServiceProvider,
                WeeklyRewardsSplittingAbiServiceProvider,
                StakingAbiServiceProvider,
                StakingService,
                StakingComputeService,
                AnalyticsGetterServiceProvider,
                {
                    provide: FeesCollectorGetterService,
                    useValue: feesCollectorGetter,
                },
                RemoteConfigGetterServiceProvider,
                AnalyticsQueryService,
                AWSTimestreamQueryService,
                DataApiQueryServiceProvider,
                TokenGetterServiceProvider,
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
