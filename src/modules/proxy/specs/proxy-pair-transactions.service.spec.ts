import { Test, TestingModule } from '@nestjs/testing';

import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { ProxyPairTransactionsService } from '../services/proxy-pair/proxy.pair.transactions.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairGetterServiceStub } from 'src/modules/pair/mocks/pair-getter-service-stub.service';
import { Address } from '@multiversx/sdk-core';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigService } from '@nestjs/config';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { CommonAppModule } from 'src/common.app.module';
import {
    ProxyAbiServiceMock,
    ProxyPairAbiServiceProvider,
} from '../mocks/proxy.abi.service.mock';
import { ProxyAbiServiceV2 } from '../v2/services/proxy.v2.abi.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WrapService } from 'src/modules/wrapping/services/wrap.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';

describe('TransactionProxyPairService', () => {
    let module: TestingModule;

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                ApiConfigService,
                ConfigService,
                MXProxyServiceProvider,
                PairService,
                PairGetterServiceProvider,
                WrapAbiServiceProvider,
                WrapTransactionsService,
                WrapService,
                TokenGetterServiceProvider,
                ProxyPairTransactionsService,
                ProxyPairAbiServiceProvider,
                {
                    provide: ProxyAbiServiceV2,
                    useClass: ProxyAbiServiceMock,
                },
                RouterAbiServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: ProxyPairTransactionsService =
            module.get<ProxyPairTransactionsService>(
                ProxyPairTransactionsService,
            );
        expect(service).toBeDefined();
    });

    it('should get add liquidity batch transaction EGLD first token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const service: ProxyPairTransactionsService =
            module.get<ProxyPairTransactionsService>(
                ProxyPairTransactionsService,
            );
        const mxProxy = module.get<MXProxyService>(MXProxyService);
        const pairGetter = module.get<PairGetterService>(PairGetterService);

        jest.spyOn(mxProxy, 'getAddressShardID').mockImplementation(
            async () => 0,
        );
        jest.spyOn(pairGetter, 'getFirstTokenID').mockImplementation(
            async () => 'TOK1-1111',
        );
        jest.spyOn(pairGetter, 'getSecondTokenID').mockImplementation(
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
        const service: ProxyPairTransactionsService =
            module.get<ProxyPairTransactionsService>(
                ProxyPairTransactionsService,
            );
        const mxProxy = module.get<MXProxyService>(MXProxyService);
        const pairGetter = module.get<PairGetterService>(PairGetterService);

        jest.spyOn(mxProxy, 'getAddressShardID').mockImplementation(
            async () => 0,
        );
        jest.spyOn(pairGetter, 'getFirstTokenID').mockImplementation(
            async () => 'TOK1-1111',
        );
        jest.spyOn(pairGetter, 'getSecondTokenID').mockImplementation(
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
