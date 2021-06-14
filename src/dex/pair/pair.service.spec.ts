import { Test, TestingModule } from '@nestjs/testing';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { RedlockService } from '../../services';
import { CachePairService } from '../../services/cache-manager/cache-pair.service';
import { ContextService } from '../utils/context.service';
import { AbiPairService } from './abi-pair.service';
import { PairService } from './pair.service';
import {
    AbiPairServiceMock,
    CachePairServiceMock,
    ContextServiceMock,
    PriceFeedServiceMock,
    RedlockServiceMock,
} from './pair.test-constants';

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

    const CachePairServiceProvider = {
        provide: CachePairService,
        useClass: CachePairServiceMock,
    };

    const RedlockServiceProvider = {
        provide: RedlockService,
        useClass: RedlockServiceMock,
    };

    const PriceFeedServiceProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AbiPairServiceProvider,
                CachePairServiceProvider,
                ContextServiceProvider,
                RedlockServiceProvider,
                PriceFeedServiceProvider,
                PairService,
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
            token: 'WXEGLD-da3f24',
            name: 'WXEGLD-da3f24',
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
        expect(allTemporaryFunds).toEqual([
            [
                {
                    tokenID: 'WXEGLD-da3f24',
                    tokenNonce: '0',
                    amount: '100',
                    pairAddress: 'pair_address_1',
                },
                {
                    tokenID: 'MEX-531623',
                    tokenNonce: '0',
                    amount: '100',
                    pairAddress: 'pair_address_1',
                },
            ],
            [
                {
                    tokenID: 'WXEGLD-da3f24',
                    tokenNonce: '0',
                    amount: '100',
                    pairAddress: 'pair_address_2',
                },
                {
                    tokenID: 'BUSD-2e8fee',
                    tokenNonce: '0',
                    amount: '100',
                    pairAddress: 'pair_address_2',
                },
            ],
            [
                {
                    tokenID: 'MEX-531623',
                    tokenNonce: '0',
                    amount: '100',
                    pairAddress: 'pair_address_3',
                },
                {
                    tokenID: 'BUSD-2e8fee',
                    tokenNonce: '0',
                    amount: '100',
                    pairAddress: 'pair_address_3',
                },
            ],
            [
                {
                    tokenID: 'MEX-531623',
                    tokenNonce: '0',
                    amount: '100',
                    pairAddress: 'pair_address_4',
                },
                {
                    tokenID: 'SPT-f66742',
                    tokenNonce: '0',
                    amount: '100',
                    pairAddress: 'pair_address_4',
                },
            ],
        ]);
    });

    it('should get simple token price in USD', async () => {
        const tokenPriceUSD = await service.getTokenPriceUSD(
            'pair_address_1',
            'MEX-531623',
        );
        expect(tokenPriceUSD).toEqual('100');
    });

    it('should get token price in USD from simple path', async () => {
        const tokenPriceUSD = await service.getTokenPriceUSD(
            'pair_address_3',
            'BUSD-2e8fee',
        );
        expect(tokenPriceUSD).toEqual('100');
    });

    it('should get token price in USD from multiple path', async () => {
        const tokenPriceUSD = await service.getTokenPriceUSD(
            'pair_address_4',
            'SPT-f66742',
        );
        expect(tokenPriceUSD).toEqual('0.01');
    });

    it('should get liquidity position from pair', async () => {
        const liquidityPosition = await service.getLiquidityPosition(
            'pair_address_1',
            '1',
        );
        expect(liquidityPosition).toEqual({
            firstTokenAmount: '1',
            secondTokenAmount: '1',
        });
    });

    it('should get lpToken Price from pair', async () => {
        const lpTokenPrice = await service.getLpTokenSecondTokenEquivalent(
            'pair_address_1',
        );
        expect(lpTokenPrice).toEqual('2');
    });

    it('should get lpToken Price in USD from pair', async () => {
        const lpTokenPriceUSD = await service.getLpTokenPriceUSD(
            'pair_address_1',
        );
        expect(lpTokenPriceUSD).toEqual('200');
    });
});
