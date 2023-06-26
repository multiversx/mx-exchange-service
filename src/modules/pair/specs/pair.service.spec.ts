import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../services/pair.service';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { PairAbiServiceProvider } from '../mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from '../mocks/pair.compute.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';

describe('PairService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairService,
                WrapAbiServiceProvider,
                TokenGetterServiceProvider,
                ContextGetterServiceProvider,
                RouterAbiServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<PairService>(PairService);

        expect(service).toBeDefined();
    });

    it('should get amount in', async () => {
        const service = module.get<PairService>(PairService);

        const amountIn = await service.getAmountIn(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            'WEGLD-123456',
            '10000000000000000',
        );
        expect(amountIn).toEqual('20262808627903914');
    });

    it('should get amount out', async () => {
        const service = module.get<PairService>(PairService);

        const amountOut = await service.getAmountOut(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            'WEGLD-123456',
            '10000000000000000',
        );
        expect(amountOut).toEqual('19743160687941225');
    });

    it('should get equivalent for liquidity', async () => {
        const service = module.get<PairService>(PairService);

        const equivalent = await service.getEquivalentForLiquidity(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            'WEGLD-123456',
            '10000000000000000',
        );
        expect(equivalent.toFixed()).toEqual('20000000000000000');
    });

    it('should get liquidity position from pair', async () => {
        const service = module.get<PairService>(PairService);

        const liquidityPosition = await service.getLiquidityPosition(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1',
        );
        expect(liquidityPosition).toEqual({
            firstTokenAmount: '1',
            secondTokenAmount: '2',
        });
    });

    it('should get liquidity position from pair in USD', async () => {
        const service = module.get<PairService>(PairService);

        const liquidityPositionUSD = await service.getLiquidityPositionUSD(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '10000',
        );
        expect(liquidityPositionUSD).toEqual('0.000000000004');
    });

    it('should get pair address by LP token ID', async () => {
        const service = module.get<PairService>(PairService);

        const address = await service.getPairAddressByLpTokenID(
            'EGLDMEXLP-abcdef',
        );
        expect(address).toEqual(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
    });

    it('should check if token is part of any pair', async () => {
        const service = module.get<PairService>(PairService);

        const isPair0 = await service.isPairEsdtToken('EGLDMEXLP-abcdef');
        expect(isPair0).toEqual(true);

        const isPair1 = await service.isPairEsdtToken('LPT-4321');
        expect(isPair1).toEqual(false);
    });
});
