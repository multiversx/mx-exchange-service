import { Test, TestingModule } from '@nestjs/testing';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { TransactionsProxyPairService } from '../services/proxy-pair/proxy-pair-transactions.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { Address } from '@multiversx/sdk-core';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { ProxyGetterServiceMock } from '../mocks/proxy.getter.service.mock';
import { ProxyPairGetterService } from '../services/proxy-pair/proxy-pair.getter.service';
import { ProxyPairGetterServiceMock } from '../mocks/proxy.pair.getter.service.mock';
import { ProxyGetterService } from '../services/proxy.getter.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigService } from '@nestjs/config';
import { CachingModule } from 'src/services/caching/cache.module';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WrapService } from 'src/modules/wrapping/services/wrap.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';

describe('TransactionProxyPairService', () => {
    let service: TransactionsProxyPairService;
    let mxProxy: MXProxyService;
    let pairAbi: PairAbiService;

    const ProxyGetterServiceProvider = {
        provide: ProxyGetterService,
        useClass: ProxyGetterServiceMock,
    };

    const ProxyPairGetterServiceProvider = {
        provide: ProxyPairGetterService,
        useClass: ProxyPairGetterServiceMock,
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
            imports: [
                CachingModule,
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
            ],
            providers: [
                ApiConfigService,
                ConfigService,
                MXProxyService,
                ProxyGetterServiceProvider,
                ProxyPairGetterServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                WrapAbiServiceProvider,
                WrapTransactionsService,
                WrapService,
                TokenGetterServiceProvider,
                RouterGetterServiceProvider,
                TransactionsProxyPairService,
                ContextGetterServiceProvider,
            ],
        }).compile();

        service = module.get<TransactionsProxyPairService>(
            TransactionsProxyPairService,
        );
        mxProxy = module.get<MXProxyService>(MXProxyService);
        pairAbi = module.get<PairAbiService>(PairAbiService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get add liquidity batch transaction EGLD first token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        jest.spyOn(mxProxy, 'getAddressShardID').mockImplementation(
            async () => 0,
        );
        jest.spyOn(pairAbi, 'firstTokenID').mockImplementation(
            async () => 'TOK1-1111',
        );
        jest.spyOn(pairAbi, 'secondTokenID').mockImplementation(
            async () => 'TOK2-2222',
        );

        const liquidityBatchTransactions = await service.addLiquidityProxyBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            'erd1qqqqqqqqqqqqqpgqrc4pg2xarca9z34njcxeur622qmfjp8w2jps89fxnl',
            {
                pairAddress: Address.Zero().bech32(),
                tokens: [
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'LKMEX-1234',
                        nonce: 1,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );

        const [wrapEgldTransaction, addLiquidityProxy] =
            liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(firstTokenAmount);
        expect(addLiquidityProxy.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDA1MDAxZTJhMTQyOGRkMWUzYTUxNDZiMzk2MGQ5ZTBmNGE1MDM2OTkwNGVlNTQ4M0AwMkA1NDRmNGIzMTJkMzEzMTMxMzFAQDBhQDRjNGI0ZDQ1NTgyZDMxMzIzMzM0QDAxQDA5QDYxNjQ2NDRjNjk3MTc1Njk2NDY5NzQ3OTUwNzI2Zjc4NzlAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwOUAwOA==',
        );
    });

    it('should get add liquidity batch transaction EGLD second token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        jest.spyOn(mxProxy, 'getAddressShardID').mockImplementation(
            async () => 0,
        );
        jest.spyOn(pairAbi, 'firstTokenID').mockImplementation(
            async () => 'TOK1-1111',
        );
        jest.spyOn(pairAbi, 'secondTokenID').mockImplementation(
            async () => 'TOK2-2222',
        );

        const liquidityBatchTransactions = await service.addLiquidityProxyBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            'erd1qqqqqqqqqqqqqpgqrc4pg2xarca9z34njcxeur622qmfjp8w2jps89fxnl',
            {
                pairAddress: Address.Zero().bech32(),
                tokens: [
                    {
                        tokenID: 'LKMEX-1234',
                        nonce: 1,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );

        const [wrapEgldTransaction, addLiquidityProxy] =
            liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(secondTokenAmount);
        expect(addLiquidityProxy.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDA1MDAxZTJhMTQyOGRkMWUzYTUxNDZiMzk2MGQ5ZTBmNGE1MDM2OTkwNGVlNTQ4M0AwMkA1NDRmNGIzMTJkMzEzMTMxMzFAQDA5QDRjNGI0ZDQ1NTgyZDMxMzIzMzM0QDAxQDBhQDYxNjQ2NDRjNjk3MTc1Njk2NDY5NzQ3OTUwNzI2Zjc4NzlAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwOEAwOQ==',
        );
    });
});
