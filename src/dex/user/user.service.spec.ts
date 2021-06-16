import { Test, TestingModule } from '@nestjs/testing';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { FarmService } from '../farm/farm.service';
import { PairService } from '../pair/pair.service';
import { ProxyFarmService } from '../proxy/proxy-farm/proxy-farm.service';
import { ProxyPairService } from '../proxy/proxy-pair/proxy-pair.service';
import { ProxyService } from '../proxy/proxy.service';
import { ContextService } from '../utils/context.service';
import { UserService } from './user.service';
import {
    ContextServiceMock,
    ElrondApiServiceMock,
    FarmServiceMock,
    PairServiceMock,
    PriceFeedServiceMock,
    ProxyFarmServiceMock,
    ProxyPairServiceMock,
    ProxyServiceMock,
} from './user.test-mocks';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';

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
                UserService,
            ],
            imports: [CacheManagerModule],
        }).compile();

        service = module.get<UserService>(UserService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get user esdt tokens', async () => {
        expect(await service.getAllEsdtTokens('user_address_1')).toEqual([
            {
                token: 'MEX-bd9937',
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
                identifier: null,
                value: '200',
            },
        ]);
    });

    it('should get user nfts tokens', async () => {
        expect(await service.getAllNFTTokens('user_address_1')).toEqual([
            {
                token: 'FMT-1234',
                name: 'FarmToken',
                type: 'SemiFungibleESDT',
                owner: 'farm_address_1',
                minted: '0',
                burnt: '0',
                decimals: 0,
                isPaused: false,
                canUpgrade: true,
                canMint: false,
                canBurn: false,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                balance: '1000000000000000000',
                identifier: 'FMT-1234-01',
                canAddSpecialRoles: true,
                canTransferNFTCreateRole: false,
                NFTCreateStopped: false,
                wiped: '0',
                attributes: 'AAAABQeMCWDbAAAAAAAAAF8CAQ==',
                creator: 'farm_address_1',
                nonce: 1,
                royalties: '0',
                value: '200',
            },
        ]);
    });
});
