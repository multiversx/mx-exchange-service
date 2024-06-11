import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { AnalyticsComputeService } from '../services/analytics.compute.service';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { LockedAssetGetterService } from 'src/modules/locked-asset-factory/services/locked.asset.getter.service';
import { AbiLockedAssetService } from 'src/modules/locked-asset-factory/services/abi-locked-asset.service';
import { AbiLockedAssetServiceMock } from 'src/modules/locked-asset-factory/mocks/abi.locked.asset.service.mock';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { FarmComputeServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.compute.service';
import { FarmComputeServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.compute.service';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { FarmComputeFactory } from 'src/modules/farm/farm.compute.factory';
import { WeekTimekeepingComputeService } from '../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
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
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import {
    FarmAbiServiceMock,
    FarmAbiServiceProvider,
} from 'src/modules/farm/mocks/farm.abi.service.mock';
import { FarmAbiServiceProviderV1_2 } from 'src/modules/farm/mocks/farm.v1.2.abi.service.mock';
import { FarmAbiServiceProviderV1_3 } from 'src/modules/farm/mocks/farm.v1.3.abi.service.mock';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { FarmServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.service';
import { FarmServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.service';
import { FarmServiceV2 } from 'src/modules/farm/v2/services/farm.v2.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { StakingFilteringService } from 'src/modules/staking/services/staking.filtering.service';

describe('AnalyticsService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
                ElasticSearchModule,
            ],
            providers: [
                ContextGetterServiceProvider,
                MXProxyServiceProvider,
                MXApiServiceProvider,
                FarmAbiFactory,
                FarmAbiServiceProvider,
                FarmAbiServiceProviderV1_2,
                FarmAbiServiceProviderV1_3,
                {
                    provide: FarmAbiServiceV2,
                    useClass: FarmAbiServiceMock,
                },
                FarmComputeFactory,
                FarmComputeServiceV1_2,
                FarmComputeServiceV1_3,
                FarmComputeServiceV2,
                FarmServiceV1_2,
                FarmServiceV1_3,
                FarmServiceV2,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                ProxyAbiServiceProvider,
                {
                    provide: AbiLockedAssetService,
                    useClass: AbiLockedAssetServiceMock,
                },
                LockedAssetGetterService,
                WrapAbiServiceProvider,
                RouterAbiServiceProvider,
                TokenServiceProvider,
                TokenComputeService,
                MXDataApiServiceProvider,
                AnalyticsComputeService,
                WeekTimekeepingComputeService,
                WeekTimekeepingAbiServiceProvider,
                WeeklyRewardsSplittingAbiServiceProvider,
                WeeklyRewardsSplittingComputeService,
                StakingAbiServiceProvider,
                StakingService,
                StakingComputeService,
                StakingFilteringService,
                EnergyAbiServiceProvider,
                RemoteConfigGetterServiceProvider,
                AnalyticsQueryServiceProvider,
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<AnalyticsComputeService>(
            AnalyticsComputeService,
        );

        expect(service).toBeDefined();
    });

    it('should get total value locked in farms', async () => {
        const service = module.get<AnalyticsComputeService>(
            AnalyticsComputeService,
        );

        const totalLockedValueUSDFarms =
            await service.computeLockedValueUSDFarms();
        expect(totalLockedValueUSDFarms.toString()).toEqual('110');
    });
});
