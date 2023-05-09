import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
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
import { LockedAssetServiceMock } from '../../locked-asset-factory/mocks/locked.asset.service.mock';
import { LockedAssetGetterService } from '../../locked-asset-factory/services/locked.asset.getter.service';
import { AbiLockedAssetService } from '../../locked-asset-factory/services/abi-locked-asset.service';
import { AbiLockedAssetServiceMock } from '../../locked-asset-factory/mocks/abi.locked.asset.service.mock';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { StakingService } from '../../staking/services/staking.service';
import { StakingServiceMock } from '../../staking/mocks/staking.service.mock';
import { StakingProxyService } from '../../staking-proxy/services/staking.proxy.service';
import { StakingProxyServiceMock } from '../../staking-proxy/mocks/staking.proxy.service.mock';
import { PriceDiscoveryServiceProvider } from '../../price-discovery/mocks/price.discovery.service.mock';
import { SimpleLockService } from '../../simple-lock/services/simple.lock.service';
import { RemoteConfigGetterService } from '../../remote-config/remote-config.getter.service';
import { RemoteConfigGetterServiceMock } from '../../remote-config/mocks/remote-config.getter.mock';
import { TokenGetterServiceProvider } from '../../tokens/mocks/token.getter.service.mock';
import { UserEsdtService } from '../services/user.esdt.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { UserEsdtComputeService } from '../services/esdt.compute.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
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
import {
    FarmServiceBaseMock,
    FarmServiceProvider,
} from 'src/modules/farm/mocks/farm.service.mock';

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
        const module: TestingModule = await Test.createTestingModule({
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
                LockedAssetProvider,
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
