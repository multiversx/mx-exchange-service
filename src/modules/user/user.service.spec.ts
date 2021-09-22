import { Test, TestingModule } from '@nestjs/testing';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { FarmService } from '../farm/services/farm.service';
import { PairService } from '../pair/pair.service';
import { ProxyFarmService } from '../proxy/proxy-farm/proxy-farm.service';
import { ProxyPairService } from '../proxy/proxy-pair/proxy-pair.service';
import { ProxyService } from '../proxy/proxy.service';
import { UserService } from './user.service';
import {
    ContextServiceMock,
    FarmServiceMock,
    LockedAssetMock,
    PriceFeedServiceMock,
    ProxyFarmServiceMock,
    ProxyPairServiceMock,
    ProxyServiceMock,
} from './user.test-mocks';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { ContextService } from '../../services/context/context.service';
import { LockedAssetService } from '../locked-asset-factory/locked-asset.service';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { WrapService } from '../wrapping/wrap.service';
import { WrapServiceMock } from '../wrapping/wrap.test-mocks';
import { ElrondApiServiceMock } from '../../services/elrond-communication/elrond.api.service.mock';
import { UserFarmToken } from './models/user.model';
import { FarmTokenAttributesModel } from '../farm/models/farmTokenAttributes.model';
import { UserComputeService } from './user.compute.service';
import { CachingModule } from '../../services/caching/cache.module';
import { PairServiceMock } from '../pair/pair.service.mock';
import { FarmGetterService } from '../farm/services/farm.getter.service';
import { FarmGetterServiceMock } from '../farm/mocks/farm.getter.service.mock';

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

    const PairServiceProvider = {
        provide: PairService,
        useClass: PairServiceMock,
    };

    const PriceFeedServiceProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
    };

    const ProxyServiceProvider = {
        provide: ProxyService,
        useClass: ProxyServiceMock,
    };

    const ProxyPairServiceProvider = {
        provide: ProxyPairService,
        useClass: ProxyPairServiceMock,
    };

    const ProxyFarmServiceProvider = {
        provide: ProxyFarmService,
        useClass: ProxyFarmServiceMock,
    };

    const LockedAssetProvider = {
        provide: LockedAssetService,
        useClass: LockedAssetMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
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
                PairServiceProvider,
                PriceFeedServiceProvider,
                ProxyServiceProvider,
                ProxyPairServiceProvider,
                ProxyFarmServiceProvider,
                FarmServiceProvider,
                FarmGetterServiceProvider,
                LockedAssetProvider,
                WrapServiceProvider,
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
            await service.getAllEsdtTokens({
                address: 'user_address_1',
                offset: 0,
                limit: 10,
            }),
        ).toEqual([
            {
                identifier: 'MEX-ec32fa',
                name: 'MaiarExchangeToken',
                type: 'FungibleESDT',
                owner:
                    'erd1x39tc3q3nn72ecjnmcz7x0qp09kp97t080x99dgyhx7zh95j0n4szskhlv',
                minted: '101000000000000000000000',
                burnt: '0',
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
            },
        ]);
    });

    it('should get user nfts tokens', async () => {
        expect(
            await service.getAllNftTokens({
                address: 'user_address_1',
                offset: 0,
                limit: 10,
            }),
        ).toEqual([
            new UserFarmToken({
                collection: 'FMT-1234',
                name: 'FarmToken',
                type: 'SemiFungibleESDT',
                decimals: 18,
                balance: '1000000000000000000',
                identifier: 'FMT-1234-01',
                attributes: 'AAAABQeMCWDbAAAAAAAAAF8CAQ==',
                creator: 'farm_address_1',
                nonce: 1,
                royalties: 0,
                valueUSD: '200',
                decodedAttributes: new FarmTokenAttributesModel({
                    aprMultiplier: 1,
                    attributes: 'AAAABQeMCWDbAAAAAAAAAF8CAQ==',
                    originalEnteringEpoch: 1,
                    enteringEpoch: 1,
                    identifier: 'FMT-1234-01',
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
