import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { ProxyService } from '../../proxy/services/proxy.service';
import { UserMetaEsdtService } from '../services/user.metaEsdt.service';
import { LockedAssetService } from '../../locked-asset-factory/services/locked-asset.service';
import { MXApiServiceProvider } from '../../../services/multiversx-communication/mx.api.service.mock';
import { UserFarmToken, UserToken } from '../models/user.model';
import { FarmTokenAttributesModelV1_2 } from '../../farm/models/farmTokenAttributes.model';
import { UserMetaEsdtComputeService } from '../services/metaEsdt.compute.service';
import { LockedAssetGetterService } from '../../locked-asset-factory/services/locked.asset.getter.service';
import { AbiLockedAssetServiceProvider } from '../../locked-asset-factory/mocks/abi.locked.asset.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { StakingServiceProvider } from '../../staking/mocks/staking.service.mock';
import { StakingProxyServiceProvider } from '../../staking-proxy/mocks/staking.proxy.service.mock';
import { PriceDiscoveryServiceProvider } from '../../price-discovery/mocks/price.discovery.service.mock';
import { SimpleLockService } from '../../simple-lock/services/simple.lock.service';
import { RemoteConfigGetterServiceProvider } from '../../remote-config/mocks/remote-config.getter.mock';
import { TokenServiceProvider } from '../../tokens/mocks/token.service.mock';
import { UserEsdtService } from '../services/user.esdt.service';
import { UserEsdtComputeService } from '../services/esdt.compute.service';
import { RolesModel } from 'src/modules/tokens/models/roles.model';
import { AssetsModel } from 'src/modules/tokens/models/assets.model';
import { FarmServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.service';
import { FarmComputeServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.compute.service';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { FarmServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.service';
import { FarmServiceV2 } from 'src/modules/farm/v2/services/farm.v2.service';
import { FarmComputeServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.compute.service';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { WeekTimekeepingComputeService } from '../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { ProgressComputeService } from '../../../submodules/weekly-rewards-splitting/services/progress.compute.service';
import { LockedTokenWrapperService } from '../../locked-token-wrapper/services/locked-token-wrapper.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { EnergyComputeService } from 'src/modules/energy/services/energy.compute.service';
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
import { StakingProxyAbiServiceProvider } from 'src/modules/staking-proxy/mocks/staking.proxy.abi.service.mock';
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
import { FarmServiceBaseMock } from 'src/modules/farm/mocks/farm.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { TokenComputeServiceProvider } from 'src/modules/tokens/mocks/token.compute.service.mock';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { FarmAbiService } from 'src/modules/farm/base-module/services/farm.abi.service';

describe('UserService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            providers: [
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                RouterAbiServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                FarmFactoryService,
                WeekTimekeepingComputeService,
                WeekTimekeepingAbiServiceProvider,
                WeeklyRewardsSplittingAbiServiceProvider,
                WeeklyRewardsSplittingComputeService,
                ProgressComputeService,
                {
                    provide: FarmServiceV1_2,
                    useClass: FarmServiceBaseMock,
                },
                FarmServiceV1_3,
                FarmServiceV2,
                FarmComputeServiceV1_2,
                FarmComputeServiceV1_3,
                FarmComputeServiceV2,
                FarmAbiServiceProviderV1_2,
                FarmAbiServiceProviderV1_3,
                {
                    provide: FarmAbiServiceV2,
                    useClass: FarmAbiServiceMock,
                },
                {
                    provide: FarmAbiService,
                    useClass: FarmAbiServiceMock,
                },
                FarmAbiFactory,
                LockedTokenWrapperAbiServiceProvider,
                ProxyService,
                ProxyAbiServiceProvider,
                {
                    provide: ProxyAbiServiceV2,
                    useClass: ProxyAbiServiceMock,
                },
                ProxyPairAbiServiceProvider,
                ProxyFarmAbiServiceProvider,
                UserMetaEsdtComputeService,
                LockedTokenWrapperService,
                LockedAssetService,
                AbiLockedAssetServiceProvider,
                LockedAssetGetterService,
                WrapAbiServiceProvider,
                StakingServiceProvider,
                StakingAbiServiceProvider,
                StakingProxyServiceProvider,
                StakingProxyAbiServiceProvider,
                PriceDiscoveryServiceProvider,
                PriceDiscoveryAbiServiceProvider,
                PriceDiscoveryComputeServiceProvider,
                SimpleLockService,
                SimpleLockAbiServiceProvider,
                EnergyAbiServiceProvider,
                EnergyComputeService,
                TokenServiceProvider,
                TokenComputeServiceProvider,
                UserEsdtService,
                UserMetaEsdtService,
                UserMetaEsdtComputeService,
                UserEsdtComputeService,
                RemoteConfigGetterServiceProvider,
                MXDataApiServiceProvider,
                ApiConfigService,
            ],
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
        }).compile();
    });

    it('should be defined', () => {
        const userEsdts = module.get<UserEsdtService>(UserEsdtService);
        const userMetaEsdts =
            module.get<UserMetaEsdtService>(UserMetaEsdtService);

        expect(userEsdts).toBeDefined();
        expect(userMetaEsdts).toBeDefined();
    });

    it('should get user esdt tokens', async () => {
        const userEsdts = module.get<UserEsdtService>(UserEsdtService);

        expect(
            await userEsdts.getAllEsdtTokens(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                ).bech32(),
                {
                    offset: 0,
                    limit: 10,
                },
            ),
        ).toEqual([
            new UserToken({
                identifier: 'MEX-123456',
                ticker: 'MEX',
                name: 'MEX',
                type: 'Ecosystem',
                owner: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                ).bech32(),
                supply: '2000000000000000000',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                balance: '1000000000000000000',
                valueUSD: '0.01',
                accounts: 1,
                initialMinted: '1',
                burnt: '1',
                minted: '1',
                circulatingSupply: '1',
                transactions: 1,
                price: '0.01',
                roles: new RolesModel(),
                assets: new AssetsModel(),
            }),
        ]);
    });

    it('should get user nfts tokens', async () => {
        const userMetaEsdts =
            module.get<UserMetaEsdtService>(UserMetaEsdtService);

        expect(
            await userMetaEsdts.getAllNftTokens(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                ).bech32(),
                {
                    offset: 0,
                    limit: 10,
                },
            ),
        ).toEqual([
            new UserFarmToken({
                collection: 'EGLDMEXFL-abcdef',
                ticker: 'EGLDMEXFL',
                name: 'FarmToken',
                type: 'SemiFungibleESDT',
                decimals: 18,
                balance: '1000000000000000000',
                identifier: 'EGLDMEXFL-abcdef-01',
                attributes: 'AAAABQeMCWDbAAAAAAAAAF8CAQ==',
                creator: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                nonce: 1,
                royalties: 0,
                valueUSD: '20',
                pairAddress: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                decodedAttributes: new FarmTokenAttributesModelV1_2({
                    aprMultiplier: 1,
                    attributes: 'AAAABQeMCWDbAAAAAAAAAF8CAQ==',
                    originalEnteringEpoch: 1,
                    enteringEpoch: 1,
                    identifier: 'EGLDMEXFL-abcdef-01',
                    lockedRewards: false,
                    rewardPerShare: '3000',
                    initialFarmingAmount: '100',
                    compoundedReward: '10',
                    currentFarmAmount: '100',
                }),
                timestamp: 0,
                uris: [],
                url: '',
                tags: [],
            }),
        ]);
    });
});
