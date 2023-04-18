import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { ProxyFarmGetterService } from '../../proxy/services/proxy-farm/proxy-farm.getter.service';
import { ProxyPairGetterService } from '../../proxy/services/proxy-pair/proxy-pair.getter.service';
import { ProxyService } from '../../proxy/services/proxy.service';
import { UserMetaEsdtService } from '../services/user.metaEsdt.service';
import { MXApiService } from '../../../services/multiversx-communication/mx.api.service';
import { LockedAssetService } from '../../locked-asset-factory/services/locked-asset.service';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { MXApiServiceMock } from '../../../services/multiversx-communication/mx.api.service.mock';
import { UserFarmToken, UserToken } from '../models/user.model';
import { FarmTokenAttributesModelV1_2 } from '../../farm/models/farmTokenAttributes.model';
import { UserMetaEsdtComputeService } from '../services/metaEsdt.compute.service';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmGetterService } from '../../farm/base-module/services/farm.getter.service';
import { FarmGetterServiceMock } from '../../farm/mocks/farm.getter.service.mock';
import { PairGetterService } from '../../pair/services/pair.getter.service';
import { PairGetterServiceStub } from '../../pair/mocks/pair-getter-service-stub.service';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { ProxyGetterServiceMock } from '../../proxy/mocks/proxy.getter.service.mock';
import { LockedAssetServiceMock } from '../../locked-asset-factory/mocks/locked.asset.service.mock';
import { LockedAssetGetterService } from '../../locked-asset-factory/services/locked.asset.getter.service';
import { AbiLockedAssetService } from '../../locked-asset-factory/services/abi-locked-asset.service';
import { AbiLockedAssetServiceMock } from '../../locked-asset-factory/mocks/abi.locked.asset.service.mock';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { ProxyPairGetterServiceMock } from '../../proxy/mocks/proxy.pair.getter.service.mock';
import { ProxyFarmGetterServiceMock } from '../../proxy/mocks/proxy.farm.getter.service.mock';
import { ProxyGetterService } from '../../proxy/services/proxy.getter.service';
import { StakingGetterService } from '../../staking/services/staking.getter.service';
import { StakingGetterServiceMock } from '../../staking/mocks/staking.getter.service.mock';
import { StakingProxyGetterService } from '../../staking-proxy/services/staking.proxy.getter.service';
import { StakingProxyGetterServiceMock } from '../../staking-proxy/mocks/staking.proxy.getter.service.mock';
import { StakingService } from '../../staking/services/staking.service';
import { StakingServiceMock } from '../../staking/mocks/staking.service.mock';
import { StakingProxyService } from '../../staking-proxy/services/staking.proxy.service';
import { StakingProxyServiceMock } from '../../staking-proxy/mocks/staking.proxy.service.mock';
import { PriceDiscoveryGetterServiceProvider } from '../../price-discovery/mocks/price.discovery.getter.mock';
import { PriceDiscoveryServiceProvider } from '../../price-discovery/mocks/price.discovery.service.mock';
import { SimpleLockService } from '../../simple-lock/services/simple.lock.service';
import { SimpleLockGetterServiceProvider } from '../../simple-lock/mocks/simple.lock.getter.service.mock';
import { RemoteConfigGetterService } from '../../remote-config/remote-config.getter.service';
import { RemoteConfigGetterServiceMock } from '../../remote-config/mocks/remote-config.getter.mock';
import { TokenGetterServiceProvider } from '../../tokens/mocks/token.getter.service.mock';
import { UserEsdtService } from '../services/user.esdt.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { RouterGetterServiceStub } from 'src/modules/router/mocks/router.getter.service.stub';
import { UserEsdtComputeService } from '../services/esdt.compute.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RolesModel } from 'src/modules/tokens/models/roles.model';
import { AssetsModel } from 'src/modules/tokens/models/assets.model';
import { FarmGetterFactory } from 'src/modules/farm/farm.getter.factory';
import { FarmGetterServiceProviderV1_2 } from 'src/modules/farm/mocks/farm.v1.2.getter.service.mock';
import { FarmGetterServiceProviderV1_3 } from 'src/modules/farm/mocks/farm.v1.3.getter.service.mock';
import { FarmGetterServiceV2 } from 'src/modules/farm/v2/services/farm.v2.getter.service';
import { FarmServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.service';
import { FarmAbiServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.abi.service';
import { AbiFarmServiceMock } from 'src/modules/farm/mocks/abi.farm.service.mock';
import { FarmComputeServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.compute.service';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { FarmServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.service';
import { FarmServiceV2 } from 'src/modules/farm/v2/services/farm.v2.service';
import { FarmAbiServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.abi.service';
import { FarmComputeServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.compute.service';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { FarmServiceMock } from 'src/modules/farm/mocks/farm.service.mock';
import { WeekTimekeepingComputeService } from '../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { ProgressComputeService } from '../../../submodules/weekly-rewards-splitting/services/progress.compute.service';
import { LockedTokenWrapperGetterService } from '../../locked-token-wrapper/services/locked-token-wrapper.getter.service';
import { LockedTokenWrapperGetterServiceMock } from '../../locked-token-wrapper/mocks/locked-token-wrapper.getter.service.mock';
import { LockedTokenWrapperService } from '../../locked-token-wrapper/services/locked-token-wrapper.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { EnergyComputeService } from 'src/modules/energy/services/energy.compute.service';

describe('UserService', () => {
    let userMetaEsdts: UserMetaEsdtService;
    let userEsdts: UserEsdtService;

    const MXApiServiceProvider = {
        provide: MXApiService,
        useClass: MXApiServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const RouterGetterServiceProvider = {
        provide: RouterGetterService,
        useClass: RouterGetterServiceStub,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    const ProxyServiceProvider = {
        provide: ProxyService,
        useClass: ProxyGetterServiceMock,
    };

    const ProxyGetterServiceProvider = {
        provide: ProxyGetterService,
        useClass: ProxyGetterServiceMock,
    };

    const ProxyPairGetterServiceProvider = {
        provide: ProxyPairGetterService,
        useClass: ProxyPairGetterServiceMock,
    };

    const ProxyFarmGetterServiceProvider = {
        provide: ProxyFarmGetterService,
        useClass: ProxyFarmGetterServiceMock,
    };

    const LockedAssetProvider = {
        provide: LockedAssetService,
        useClass: LockedAssetServiceMock,
    };

    const AbiLockedAssetServiceProvider = {
        provide: AbiLockedAssetService,
        useClass: AbiLockedAssetServiceMock,
    };

    const StakingServiceProvider = {
        provide: StakingService,
        useClass: StakingServiceMock,
    };

    const StakingProxyServiceProvider = {
        provide: StakingProxyService,
        useClass: StakingProxyServiceMock,
    };

    const StakingGetterServiceProvider = {
        provide: StakingGetterService,
        useClass: StakingGetterServiceMock,
    };

    const StakingProxyGetterServiceProvider = {
        provide: StakingProxyGetterService,
        useClass: StakingProxyGetterServiceMock,
    };

    const RemoteConfigGetterServiceProvider = {
        provide: RemoteConfigGetterService,
        useClass: RemoteConfigGetterServiceMock,
    };

    const logTransports: Transport[] = [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                nestWinstonModuleUtilities.format.nestLike(),
            ),
        }),
    ];

    beforeEach(async () => {
        const getter = new LockedTokenWrapperGetterServiceMock({
            getLockedTokenId(address: string): Promise<string> {
                return Promise.resolve('ELKMEX-7e6873');
            },
            getWrappedTokenId(address: string): Promise<string> {
                return Promise.resolve('WELKMEX-4b8419');
            },
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                RouterGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                FarmFactoryService,
                FarmGetterFactory,
                {
                    provide: FarmServiceV1_2,
                    useClass: FarmServiceMock,
                },
                WeekTimekeepingComputeService,
                WeekTimekeepingAbiServiceProvider,
                WeeklyRewardsSplittingAbiServiceProvider,
                ProgressComputeService,
                FarmComputeServiceV1_2,
                {
                    provide: FarmAbiServiceV1_2,
                    useClass: AbiFarmServiceMock,
                },
                FarmGetterServiceProviderV1_2,
                {
                    provide: FarmAbiServiceV1_3,
                    useClass: AbiFarmServiceMock,
                },
                FarmComputeServiceV1_3,
                FarmGetterServiceProviderV1_3,
                {
                    provide: FarmGetterService,
                    useClass: FarmGetterServiceMock,
                },
                {
                    provide: FarmGetterServiceV2,
                    useClass: FarmGetterServiceMock,
                },
                FarmServiceV1_3,
                {
                    provide: FarmAbiServiceV1_3,
                    useClass: AbiFarmServiceMock,
                },
                FarmComputeServiceV1_3,
                FarmServiceV2,
                FarmComputeServiceV2,
                {
                    provide: FarmAbiServiceV2,
                    useClass: AbiFarmServiceMock,
                },
                ProxyServiceProvider,
                ProxyGetterServiceProvider,
                {
                    provide: LockedTokenWrapperGetterService,
                    useValue: getter,
                },
                UserMetaEsdtComputeService,
                LockedTokenWrapperService,
                ProxyPairGetterServiceProvider,
                ProxyFarmGetterServiceProvider,
                LockedAssetProvider,
                AbiLockedAssetServiceProvider,
                LockedAssetGetterService,
                WrapAbiServiceProvider,
                StakingServiceProvider,
                StakingGetterServiceProvider,
                StakingProxyServiceProvider,
                StakingProxyGetterServiceProvider,
                PriceDiscoveryServiceProvider,
                PriceDiscoveryGetterServiceProvider,
                SimpleLockService,
                SimpleLockGetterServiceProvider,
                EnergyAbiServiceProvider,
                EnergyComputeService,
                TokenGetterServiceProvider,
                TokenComputeService,
                TokenService,
                UserEsdtService,
                UserMetaEsdtService,
                UserMetaEsdtComputeService,
                UserEsdtComputeService,
                RemoteConfigGetterServiceProvider,
                MXDataApiServiceProvider,
            ],
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                CachingModule,
            ],
        }).compile();

        userEsdts = module.get<UserEsdtService>(UserEsdtService);
        userMetaEsdts = module.get<UserMetaEsdtService>(UserMetaEsdtService);
    });

    it('should be defined', () => {
        expect(userEsdts).toBeDefined();
        expect(userMetaEsdts).toBeDefined();
    });

    it('should get user esdt tokens', async () => {
        expect(
            await userEsdts.getAllEsdtTokens('user_address_1', {
                offset: 0,
                limit: 10,
            }),
        ).toEqual([
            new UserToken({
                identifier: 'TOK2-2222',
                ticker: 'TOK2',
                name: 'SecondToken',
                type: '',
                owner: 'owner_address',
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
                valueUSD: '100',
                accounts: 1,
                initialMinted: '1',
                burnt: '1',
                minted: '1',
                circulatingSupply: '1',
                transactions: 1,
                price: '1',
                roles: new RolesModel(),

                assets: new AssetsModel({
                    description: '',
                    extraTokens: [],
                    lockedAccounts: [],
                    svgUrl: '',
                    pngUrl: '',
                    status: '',
                    website: '',
                }),
            }),
        ]);
    });

    it('should get user nfts tokens', async () => {
        expect(
            await userMetaEsdts.getAllNftTokens('user_address_1', {
                offset: 0,
                limit: 10,
            }),
        ).toEqual([
            new UserFarmToken({
                collection: 'TOK1TOK4LPStaked',
                ticker: 'TOK1TOK4LPStaked',
                name: 'FarmToken',
                type: 'SemiFungibleESDT',
                decimals: 18,
                balance: '1000000000000000000',
                identifier: 'TOK1TOK4LPStaked-01',
                attributes: 'AAAABQeMCWDbAAAAAAAAAF8CAQ==',
                creator:
                    'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                nonce: 1,
                royalties: 0,
                valueUSD: '80000200',
                decodedAttributes: new FarmTokenAttributesModelV1_2({
                    aprMultiplier: 1,
                    attributes: 'AAAABQeMCWDbAAAAAAAAAF8CAQ==',
                    originalEnteringEpoch: 1,
                    enteringEpoch: 1,
                    identifier: 'TOK1TOK4LPStaked-01',
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
