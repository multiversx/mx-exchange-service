import { Test, TestingModule } from '@nestjs/testing';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { FarmService } from '../farm/services/farm.service';
import { PairService } from '../pair/services/pair.service';
import { ProxyFarmGetterService } from '../proxy/services/proxy-farm/proxy-farm.getter.service';
import { ProxyPairGetterService } from '../proxy/services/proxy-pair/proxy-pair.getter.service';
import { ProxyService } from '../proxy/services/proxy.service';
import { UserService } from './user.service';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { ContextService } from '../../services/context/context.service';
import { LockedAssetService } from '../locked-asset-factory/services/locked-asset.service';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { WrapService } from '../wrapping/wrap.service';
import { WrapServiceMock } from '../wrapping/wrap.test-mocks';
import { ElrondApiServiceMock } from '../../services/elrond-communication/elrond.api.service.mock';
import { UserFarmToken, UserToken } from './models/user.model';
import { FarmTokenAttributesModel } from '../farm/models/farmTokenAttributes.model';
import { UserComputeService } from './user.compute.service';
import { CachingModule } from '../../services/caching/cache.module';
import { FarmGetterService } from '../farm/services/farm.getter.service';
import { FarmGetterServiceMock } from '../farm/mocks/farm.getter.service.mock';
import { FarmServiceMock } from '../farm/mocks/farm.service.mock';
import { ContextServiceMock } from 'src/services/context/mocks/context.service.mock';
import { PriceFeedServiceMock } from 'src/services/price-feed/price.feed.service.mock';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { PairGetterServiceMock } from '../pair/mocks/pair.getter.service.mock';
import { PairComputeService } from '../pair/services/pair.compute.service';
import { ProxyGetterServiceMock } from '../proxy/mocks/proxy.getter.service.mock';
import { LockedAssetServiceMock } from '../locked-asset-factory/mocks/locked.asset.service.mock';
import { LockedAssetGetterService } from '../locked-asset-factory/services/locked.asset.getter.service';
import { AbiLockedAssetService } from '../locked-asset-factory/services/abi-locked-asset.service';
import { AbiLockedAssetServiceMock } from '../locked-asset-factory/mocks/abi.locked.asset.service.mock';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { ProxyPairGetterServiceMock } from '../proxy/mocks/proxy.pair.getter.service.mock';
import { ProxyFarmGetterServiceMock } from '../proxy/mocks/proxy.farm.getter.service.mock';
import { ProxyGetterService } from '../proxy/services/proxy.getter.service';
import { StakingGetterService } from '../staking/services/staking.getter.service';
import { StakingGetterServiceMock } from '../staking/mocks/staking.getter.service.mock';
import { StakingProxyGetterService } from '../staking-proxy/services/staking.proxy.getter.service';
import { StakingProxyGetterServiceMock } from '../staking-proxy/mocks/staking.proxy.getter.service.mock';
import { StakingService } from '../staking/services/staking.service';
import { StakingServiceMock } from '../staking/mocks/staking.service.mock';
import { StakingProxyService } from '../staking-proxy/services/staking.proxy.service';
import { StakingProxyServiceMock } from '../staking-proxy/mocks/staking.proxy.service.mock';
import { PriceDiscoveryGetterServiceProvider } from '../price-discovery/mocks/price.discovery.getter.mock';
import { PriceDiscoveryServiceProvider } from '../price-discovery/mocks/price.discovery.service.mock';
import { SimpleLockService } from '../simple-lock/services/simple.lock.service';
import { SimpleLockGetterServiceProvider } from '../simple-lock/mocks/simple.lock.getter.service.mock';
import { AssetsModel, RolesModel } from '../tokens/models/esdtToken.model';

describe('UserService', () => {
    let service: UserService;

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
    };

    const FarmServiceProvider = {
        provide: FarmService,
        useClass: FarmServiceMock,
    };

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

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const PriceFeedServiceProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
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

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
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
                ElrondApiServiceProvider,
                ContextServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                PriceFeedServiceProvider,
                ProxyServiceProvider,
                ProxyGetterServiceProvider,
                ProxyPairGetterServiceProvider,
                ProxyFarmGetterServiceProvider,
                FarmServiceProvider,
                FarmGetterServiceProvider,
                LockedAssetProvider,
                AbiLockedAssetServiceProvider,
                LockedAssetGetterService,
                WrapServiceProvider,
                StakingServiceProvider,
                StakingGetterServiceProvider,
                StakingProxyServiceProvider,
                StakingProxyGetterServiceProvider,
                PriceDiscoveryServiceProvider,
                PriceDiscoveryGetterServiceProvider,
                SimpleLockService,
                SimpleLockGetterServiceProvider,
                UserService,
                UserComputeService,
            ],
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                CachingModule,
            ],
        }).compile();

        service = module.get<UserService>(UserService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get user esdt tokens', async () => {
        expect(
            await service.getAllEsdtTokens('user_address_1', {
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
                valueUSD: '2000',
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
            await service.getAllNftTokens('user_address_1', {
                offset: 0,
                limit: 10,
            }),
        ).toEqual([
            new UserFarmToken({
                collection: 'TOK1TOK4LPStaked',
                name: 'FarmToken',
                type: 'SemiFungibleESDT',
                decimals: 18,
                balance: '1000000000000000000',
                identifier: 'TOK1TOK4LPStaked-01',
                attributes: 'AAAABQeMCWDbAAAAAAAAAF8CAQ==',
                creator: 'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                nonce: 1,
                royalties: 0,
                valueUSD: '80000200',
                decodedAttributes: new FarmTokenAttributesModel({
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
