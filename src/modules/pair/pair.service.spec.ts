import { Test, TestingModule } from '@nestjs/testing';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { RedlockService } from '../../services';
import { AbiPairService } from './abi-pair.service';
import { PairService } from './pair.service';
import {
    AbiPairServiceMock,
    PriceFeedServiceMock,
    RedlockServiceMock,
    WrapServiceMock,
} from './pair.test-constants';
import { ContextService } from '../../services/context/context.service';
import { WrapService } from '../wrapping/wrap.service';
import { CommonAppModule } from '../../common.app.module';
import { CachingModule } from '../../services/caching/cache.module';
import { ContextServiceMock } from '../../services/context/context.service.mocks';
import { TemporaryFundsModel } from './models/pair.model';

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
        const firstToken = await service.getFirstToken(
            'erd1qqqqqqqqqqqqqpgquh2r06qrjesfv5xj6v8plrqm93c6xvw70n4sfuzpmc',
        );
        expect(firstToken).toEqual({
            identifier: 'WEGLD-073650',
            name: 'WEGLD-073650',
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
        expect(allTemporaryFunds[0]).toEqual(
            new TemporaryFundsModel({
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgquh2r06qrjesfv5xj6v8plrqm93c6xvw70n4sfuzpmc',
                firstToken: {
                    identifier: 'WEGLD-073650',
                    name: 'WEGLD-073650',
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
                    identifier: 'MEX-ec32fa',
                    name: 'MEX-ec32fa',
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
            }),
        );
    });

    it('should get simple token price in USD', async () => {
        const tokenPriceUSD = await service.computeTokenPriceUSD(
            'WEGLD-073650',
        );
        expect(tokenPriceUSD.toFixed()).toEqual('200');
    });

    it('should get token price in USD from simple path', async () => {
        const tokenPriceUSD = await service.computeTokenPriceUSD('BUSD-f2c46d');
        expect(tokenPriceUSD.toFixed()).toEqual('100');
    });

    it('should get token price in USD from multiple path', async () => {
        const tokenPriceUSD = await service.computeTokenPriceUSD('MEX-ec32fa');
        expect(tokenPriceUSD.toFixed()).toEqual('100');
    });

    it('should get liquidity position from pair', async () => {
        const liquidityPosition = await service.getLiquidityPosition(
            'erd1qqqqqqqqqqqqqpgquh2r06qrjesfv5xj6v8plrqm93c6xvw70n4sfuzpmc',
            '1',
        );
        expect(liquidityPosition).toEqual({
            firstTokenAmount: '1',
            secondTokenAmount: '2',
        });
    });

    it('should get lpToken Price in USD from pair', async () => {
        const lpTokenPriceUSD = await service.getLpTokenPriceUSD(
            'erd1qqqqqqqqqqqqqpgquh2r06qrjesfv5xj6v8plrqm93c6xvw70n4sfuzpmc',
        );
        expect(lpTokenPriceUSD).toEqual('400');
    });
});
