import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { ProxyService } from '../../proxy/services/proxy.service';
import { UserMetaEsdtService } from '../services/user.metaEsdt.service';
import { LockedAssetService } from '../../locked-asset-factory/services/locked-asset.service';
import { MXApiServiceProvider } from '../../../services/multiversx-communication/mx.api.service.mock';
import { UserMetaEsdtComputeService } from '../services/metaEsdt.compute.service';
import { LockedAssetGetterService } from '../../locked-asset-factory/services/locked.asset.getter.service';
import { AbiLockedAssetServiceProvider } from '../../locked-asset-factory/mocks/abi.locked.asset.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { StakingServiceProvider } from '../../staking/mocks/staking.service.mock';
import { PriceDiscoveryServiceProvider } from '../../price-discovery/mocks/price.discovery.service.mock';
import { SimpleLockService } from '../../simple-lock/services/simple.lock.service';
import { RemoteConfigGetterServiceProvider } from '../../remote-config/mocks/remote-config.getter.mock';
import { TokenServiceProvider } from '../../tokens/mocks/token.service.mock';
import { UserEsdtComputeService } from '../services/esdt.compute.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { FarmServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.service';
import { FarmComputeServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.compute.service';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { FarmServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.service';
import { FarmServiceV2 } from 'src/modules/farm/v2/services/farm.v2.service';
import { FarmComputeServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.compute.service';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { WeekTimekeepingComputeService } from '../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { LockedTokenWrapperService } from '../../locked-token-wrapper/services/locked-token-wrapper.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import {
    ProxyAbiServiceMock,
    ProxyAbiServiceProvider,
    ProxyFarmAbiServiceProvider,
    ProxyPairAbiServiceProvider,
} from 'src/modules/proxy/mocks/proxy.abi.service.mock';
import { ProxyAbiServiceV2 } from 'src/modules/proxy/v2/services/proxy.v2.abi.service';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { StakingAbiServiceProvider } from 'src/modules/staking/mocks/staking.abi.service.mock';
import { SimpleLockAbiServiceProvider } from 'src/modules/simple-lock/mocks/simple.lock.abi.service.mock';
import { PriceDiscoveryAbiServiceProvider } from 'src/modules/price-discovery/mocks/price.discovery.abi.service.mock';
import { PriceDiscoveryComputeServiceProvider } from 'src/modules/price-discovery/mocks/price.discovery.compute.service.mock';
import { LockedTokenWrapperAbiServiceProvider } from 'src/modules/locked-token-wrapper/mocks/locked.token.wrapper.abi.service.mock';
import { FarmAbiServiceMock } from 'src/modules/farm/mocks/farm.abi.service.mock';
import { FarmAbiServiceProviderV1_2 } from 'src/modules/farm/mocks/farm.v1.2.abi.service.mock';
import { FarmAbiServiceProviderV1_3 } from 'src/modules/farm/mocks/farm.v1.3.abi.service.mock';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { StakingProxyService } from '../../staking-proxy/services/staking.proxy.service';
import { StakingProxyAbiService } from '../../staking-proxy/services/staking.proxy.abi.service';
import { UserEnergyComputeService } from '../services/userEnergy/user.energy.compute.service';
import { MXProxyServiceProvider } from '../../../services/multiversx-communication/mx.proxy.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { scAddress } from 'src/config';
import { ContractType } from '../models/user.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { MetabondingAbiServiceMockProvider } from 'src/modules/metabonding/mocks/metabonding.abi.service.mock';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { StakingProxyFilteringService } from 'src/modules/staking-proxy/services/staking.proxy.filtering.service';
import { StakingComputeService } from 'src/modules/staking/services/staking.compute.service';
import { FarmAbiService } from 'src/modules/farm/base-module/services/farm.abi.service';

describe('UserEnergyComputeService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            providers: [
                UserEnergyComputeService,
                ContextGetterServiceProvider,
                TokenServiceProvider,
                TokenComputeService,
                RouterAbiServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                ProxyAbiServiceProvider,
                {
                    provide: ProxyAbiServiceV2,
                    useClass: ProxyAbiServiceMock,
                },
                FarmServiceV1_2,
                FarmServiceV1_3,
                FarmServiceV2,
                FarmComputeServiceV1_2,
                FarmComputeServiceV1_3,
                FarmComputeServiceV2,
                FarmAbiServiceProviderV1_2,
                FarmAbiServiceProviderV1_3,
                LockedTokenWrapperService,
                {
                    provide: FarmAbiServiceV2,
                    useClass: FarmAbiServiceMock,
                },
                {
                    provide: FarmAbiService,
                    useClass: FarmAbiServiceMock,
                },
                LockedTokenWrapperAbiServiceProvider,
                LockedAssetService,
                FarmAbiFactory,
                FarmFactoryService,
                WeekTimekeepingAbiServiceProvider,
                WeeklyRewardsSplittingAbiServiceProvider,
                WeekTimekeepingComputeService,
                WeeklyRewardsSplittingComputeService,
                UserMetaEsdtService,
                UserEsdtComputeService,
                StakingProxyService,
                StakingProxyAbiService,
                StakingProxyFilteringService,
                SimpleLockAbiServiceProvider,
                SimpleLockService,
                StakingAbiServiceProvider,
                StakingServiceProvider,
                StakingComputeService,
                PriceDiscoveryServiceProvider,
                PriceDiscoveryAbiServiceProvider,
                PriceDiscoveryComputeServiceProvider,
                EnergyAbiServiceProvider,
                ProxyService,
                ProxyPairAbiServiceProvider,
                ProxyFarmAbiServiceProvider,
                UserMetaEsdtComputeService,
                WrapAbiServiceProvider,
                MXDataApiServiceProvider,
                MXApiServiceProvider,
                MXProxyServiceProvider,
                LockedAssetGetterService,
                MetabondingAbiServiceMockProvider,
                RemoteConfigGetterServiceProvider,
                AbiLockedAssetServiceProvider,
                AnalyticsQueryServiceProvider,
                ApiConfigService,
            ],
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
                ElasticSearchModule,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const UserEnergyCompute = module.get<UserEnergyComputeService>(
            UserEnergyComputeService,
        );

        expect(UserEnergyCompute).toBeDefined();
    });

    it('same values', () => {
        const UserEnergyCompute = module.get<UserEnergyComputeService>(
            UserEnergyComputeService,
        );

        expect(UserEnergyCompute).toBeDefined();
        expect(
            UserEnergyCompute.isEnergyOutdated(
                {
                    amount: '100',
                    lastUpdateEpoch: 10,
                    totalLockedTokens: '5',
                },
                {
                    week: 10,
                    energy: {
                        amount: '100',
                        lastUpdateEpoch: 10,
                        totalLockedTokens: '5',
                    },
                },
            ),
        ).toBe(false);
    });
    it('current user energy values are older', () => {
        const UserEnergyCompute = module.get<UserEnergyComputeService>(
            UserEnergyComputeService,
        );

        expect(UserEnergyCompute).toBeDefined();
        expect(
            UserEnergyCompute.isEnergyOutdated(
                {
                    amount: '105',
                    lastUpdateEpoch: 9,
                    totalLockedTokens: '5',
                },
                {
                    week: 10,
                    energy: {
                        amount: '100',
                        lastUpdateEpoch: 10,
                        totalLockedTokens: '5',
                    },
                },
            ),
        ).toBe(false);
    });
    it('current user energy values are older', () => {
        const UserEnergyCompute = module.get<UserEnergyComputeService>(
            UserEnergyComputeService,
        );
        expect(
            UserEnergyCompute.isEnergyOutdated(
                {
                    amount: '100',
                    lastUpdateEpoch: 10,
                    totalLockedTokens: '5',
                },
                {
                    week: 10,
                    energy: {
                        amount: '105',
                        lastUpdateEpoch: 9,
                        totalLockedTokens: '5',
                    },
                },
            ),
        ).toBe(false);
    });

    it('should get outdated contracts on old claim progress', async () => {
        const service = module.get<UserEnergyComputeService>(
            UserEnergyComputeService,
        );
        const weeklyRewardsSplittingAbi =
            module.get<WeeklyRewardsSplittingAbiService>(
                WeeklyRewardsSplittingAbiService,
            );
        const weekTimekeepingAbi = module.get<WeekTimekeepingAbiService>(
            WeekTimekeepingAbiService,
        );
        const energyAbi = module.get<EnergyAbiService>(EnergyAbiService);
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'currentClaimProgress',
        ).mockResolvedValue({
            week: 9,
            energy: {
                amount: '105',
                lastUpdateEpoch: 9,
                totalLockedTokens: '5',
            },
        });
        jest.spyOn(weekTimekeepingAbi, 'currentWeek').mockResolvedValue(10);
        jest.spyOn(energyAbi, 'energyEntryForUser').mockResolvedValue({
            amount: '100',
            lastUpdateEpoch: 10,
            totalLockedTokens: '5',
        });

        const outdatedContracts =
            await service.computeFeesCollectorOutdatedContract(
                Address.Zero().bech32(),
            );

        expect(outdatedContracts).toEqual({
            address: scAddress.feesCollector,
            type: ContractType.FeesCollector,
            claimProgressOutdated: true,
        });
    });

    it('should NOT get outdated contracts if no claim progress', async () => {
        const service = module.get<UserEnergyComputeService>(
            UserEnergyComputeService,
        );
        const weeklyRewardsSplittingAbi =
            module.get<WeeklyRewardsSplittingAbiService>(
                WeeklyRewardsSplittingAbiService,
            );
        const weekTimekeepingAbi = module.get<WeekTimekeepingAbiService>(
            WeekTimekeepingAbiService,
        );
        const energyAbi = module.get<EnergyAbiService>(EnergyAbiService);
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'currentClaimProgress',
        ).mockResolvedValue({
            week: 0,
            energy: {
                amount: '0',
                lastUpdateEpoch: 0,
                totalLockedTokens: '0',
            },
        });
        jest.spyOn(weekTimekeepingAbi, 'currentWeek').mockResolvedValue(10);
        jest.spyOn(energyAbi, 'energyEntryForUser').mockResolvedValue({
            amount: '0',
            lastUpdateEpoch: 0,
            totalLockedTokens: '0',
        });

        const outdatedContracts =
            await service.computeFeesCollectorOutdatedContract(
                Address.Zero().bech32(),
            );

        expect(outdatedContracts).toEqual({});
    });
});
