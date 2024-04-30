import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../services/pair.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { PairAbiServiceProvider } from '../mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from '../mocks/pair.compute.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';

describe('PairService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairService,
                WrapAbiServiceProvider,
                TokenServiceProvider,
                ContextGetterServiceProvider,
                RouterAbiServiceProvider,
                ApiConfigService,
                MXApiServiceProvider,
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
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            'WEGLD-123456',
            '1000000000000000000',
        );
        expect(amountIn).toEqual('1004013040121365096290');
    });

    it('should get amount out', async () => {
        const service = module.get<PairService>(PairService);

        const amountOut = await service.getAmountOut(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            'WEGLD-123456',
            '1000000000000000000',
        );
        expect(amountOut).toEqual('996006981039903216493');
    });

    it('should get equivalent for liquidity', async () => {
        const service = module.get<PairService>(PairService);

        const equivalent = await service.getEquivalentForLiquidity(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            'WEGLD-123456',
            '1000000000000000000',
        );
        expect(equivalent.toFixed()).toEqual('1000000000000000000000');
    });

    it('should get liquidity position from pair', async () => {
        const service = module.get<PairService>(PairService);

        const liquidityPosition = await service.getLiquidityPosition(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            '1',
        );
        expect(liquidityPosition).toEqual({
            firstTokenAmount: '1',
            secondTokenAmount: '1000',
        });
    });

    it('should get liquidity position from pair in USD', async () => {
        const service = module.get<PairService>(PairService);

        const liquidityPositionUSD = await service.getLiquidityPositionUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            '1000000000000000000',
        );
        expect(liquidityPositionUSD).toEqual('20');
    });

    it('should get pair address by LP token ID', async () => {
        const service = module.get<PairService>(PairService);

        const address = await service.getPairAddressByLpTokenID(
            'EGLDMEXLP-abcdef',
        );
        expect(address).toEqual(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
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
