import { Test, TestingModule } from '@nestjs/testing';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { RedlockService } from '../../services';
import { AbiPairService } from './abi-pair.service';
import { PairService } from './pair.service';
import {
    AbiPairServiceMock,
    ContextServiceMock,
    PriceFeedServiceMock,
    RedlockServiceMock,
    WrapServiceMock,
} from './pair.test-constants';
import { ContextService } from '../../services/context/context.service';
import { WrapService } from '../wrapping/wrap.service';
import { CommonAppModule } from '../../common.app.module';
import { CachingModule } from '../../services/caching/cache.module';

describe('PairService', () => {
    let service: PairService;

    const AbiPairServiceProvider = {
        provide: AbiPairService,
        useClass: AbiPairServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const RedlockServiceProvider = {
        provide: RedlockService,
        useClass: RedlockServiceMock,
    };

    const PriceFeedServiceProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                AbiPairServiceProvider,
                ContextServiceProvider,
                RedlockServiceProvider,
                PriceFeedServiceProvider,
                PairService,
                WrapServiceProvider,
            ],
        }).compile();

        service = module.get<PairService>(PairService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get first token', async () => {
        const firstToken = await service.getFirstToken('pair_address_1');
        expect(firstToken).toEqual({
            identifier: 'WEGLD-88600a',
            name: 'WEGLD-88600a',
            type: 'FungibleESDT',
            owner: 'user_address_1',
            minted: '0',
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
        });
    });

    it('should get all temporary funds for user', async () => {
        const allTemporaryFunds = await service.getTemporaryFunds(
            'user_address_1',
        );
        expect(allTemporaryFunds[0]).toEqual({
            pairAddress: 'pair_address_1',
            firstToken: {
                identifier: 'WEGLD-88600a',
                name: 'WEGLD-88600a',
                type: 'FungibleESDT',
                owner: 'user_address_1',
                minted: '0',
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
            },
            firstAmount: '100',
            secondToken: {
                identifier: 'MEX-b6bb7d',
                name: 'MEX-b6bb7d',
                type: 'FungibleESDT',
                owner: 'user_address_1',
                minted: '0',
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
            },
            secondAmount: '100',
        });
    });

    it('should get simple token price in USD', async () => {
        const tokenPriceUSD = await service.getTokenPriceUSD(
            'pair_address_1',
            'MEX-b6bb7d',
        );
        expect(tokenPriceUSD.toFixed()).toEqual('50');
    });

    it('should get token price in USD from simple path', async () => {
        const tokenPriceUSD = await service.getTokenPriceUSD(
            'pair_address_3',
            'BUSD-05b16f',
        );
        expect(tokenPriceUSD.toFixed()).toEqual('100');
    });

    it('should get token price in USD from multiple path', async () => {
        const tokenPriceUSD = await service.getTokenPriceUSD(
            'pair_address_4',
            'SPT-f66742',
        );
        expect(tokenPriceUSD.toFixed()).toEqual('16.66666666666666665');
    });

    it('should get liquidity position from pair', async () => {
        const liquidityPosition = await service.getLiquidityPosition(
            'pair_address_1',
            '1',
        );
        expect(liquidityPosition).toEqual({
            firstTokenAmount: '1',
            secondTokenAmount: '2',
        });
    });

    it('should get lpToken Price from pair', async () => {
        const lpTokenPrice = await service.getLpTokenSecondTokenEquivalent(
            'pair_address_1',
        );
        expect(lpTokenPrice).toEqual('4');
    });

    it('should get lpToken Price in USD from pair', async () => {
        const lpTokenPriceUSD = await service.getLpTokenPriceUSD(
            'pair_address_1',
        );
        expect(lpTokenPriceUSD).toEqual('200');
    });
});
