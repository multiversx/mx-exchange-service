import { Test, TestingModule } from '@nestjs/testing';
import { AutoRouterService } from '../services/auto-router.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { WinstonModule } from 'nest-winston';
import { AutoRouterComputeService } from '../services/auto-router.compute.service';
import { AutoRouterTransactionService } from '../services/auto-router.transactions.service';
import { PairTransactionService } from 'src/modules/pair/services/pair.transactions.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { MXProxyServiceMock } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterTransactionService } from 'src/modules/router/services/router.transactions.service';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { RouterService } from 'src/modules/router/services/router.service';
import { AutoRouteModel } from '../models/auto-route.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { Address } from '@multiversx/sdk-core';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { RemoteConfigGetterServiceMock } from 'src/modules/remote-config/mocks/remote-config.getter.mock';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { encodeTransactionData } from 'src/helpers/helpers';
import { gasConfig } from 'src/config';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WrapService } from 'src/modules/wrapping/services/wrap.service';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { ConfigModule } from '@nestjs/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

describe('AutoRouterService', () => {
    let service: AutoRouterService;

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const MXProxyServiceProvider = {
        provide: MXProxyService,
        useClass: MXProxyServiceMock,
    };

    const RemoteConfigGetterServiceProvider = {
        provide: RemoteConfigGetterService,
        useClass: RemoteConfigGetterServiceMock,
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                RouterService,
                RouterAbiServiceProvider,
                ContextGetterServiceProvider,
                MXProxyServiceProvider,
                TokenServiceProvider,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairService,
                PairTransactionService,
                WrapAbiServiceProvider,
                WrapService,
                WrapTransactionsService,
                RouterTransactionService,
                RemoteConfigGetterServiceProvider,
                AutoRouterService,
                AutoRouterComputeService,
                AutoRouterTransactionService,
                ApiConfigService,
            ],
            exports: [],
        }).compile();

        service = module.get<AutoRouterService>(AutoRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get swap data for simple swap with default inputs', async () => {
        const swap = await service.swap({
            tokenInID: 'USDC-123456',
            tokenOutID: 'WEGLD-123456',
            tolerance: 0.01,
        });

        expect(swap).toEqual(
            new AutoRouteModel({
                swapType: 0,
                tokenInID: 'USDC-123456',
                tokenOutID: 'WEGLD-123456',
                tokenInExchangeRate: '99690060900928177',
                tokenOutExchangeRate: '10031090',
                tokenInExchangeRateDenom: '0.099690060900928177',
                tokenOutExchangeRateDenom: '10.03109',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '10',
                amountIn: '1000000',
                amountOut: '99690060900928177',
                intermediaryAmounts: ['1000000', '99690060900928177'],
                tokenRoute: ['USDC-123456', 'WEGLD-123456'],
                pairs: [
                    new PairModel({
                        address: Address.fromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).bech32(),
                        firstToken: Tokens('WEGLD-123456'),
                        secondToken: Tokens('USDC-123456'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000000',
                            reserves1: '10000000000',
                            totalSupply: '10000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                ],
                tolerance: 0.01,
                maxPriceDeviationPercent: 1,
                tokensPriceDeviationPercent: undefined,
            }),
        );
    });

    it('should get swap data for simple swap with amountIn', async () => {
        const swap = await service.swap({
            amountIn: '2000000',
            tokenInID: 'USDC-123456',
            tokenOutID: 'WEGLD-123456',
            tolerance: 0.01,
        });
        expect(swap).toEqual(
            new AutoRouteModel({
                swapType: 0,
                tokenInID: 'USDC-123456',
                tokenOutID: 'WEGLD-123456',
                tokenInExchangeRate: '99680123783317606',
                tokenOutExchangeRate: '10032090',
                tokenInExchangeRateDenom: '0.099680123783317606',
                tokenOutExchangeRateDenom: '10.03209',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '10',
                amountIn: '2000000',
                amountOut: '199360247566635212',
                intermediaryAmounts: ['2000000', '199360247566635212'],
                tokenRoute: ['USDC-123456', 'WEGLD-123456'],
                pairs: [
                    new PairModel({
                        address: Address.fromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).bech32(),
                        firstToken: Tokens('WEGLD-123456'),
                        secondToken: Tokens('USDC-123456'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000000',
                            reserves1: '10000000000',
                            totalSupply: '10000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                ],
                tolerance: 0.01,
                maxPriceDeviationPercent: 1,
                tokensPriceDeviationPercent: undefined,
            }),
        );
    });

    it('should get swap data for multi swap with amountOut', async () => {
        const swap = await service.swap({
            amountOut: '1000000000000000000000',
            tokenInID: 'USDC-123456',
            tokenOutID: 'MEX-123456',
            tolerance: 0.01,
        });

        expect(swap).toEqual(
            new AutoRouteModel({
                swapType: 1,
                tokenInID: 'USDC-123456',
                tokenOutID: 'MEX-123456',
                tokenInExchangeRate: '99201792616073289490',
                tokenOutExchangeRate: '10080',
                tokenInExchangeRateDenom: '99.20179261607328949',
                tokenOutExchangeRateDenom: '0.01008',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '0.01',
                amountIn: '10181267',
                amountOut: '1000000000000000000000',
                intermediaryAmounts: [
                    '10080463',
                    '1004013040121365097',
                    '1000000000000000000000',
                ],
                tokenRoute: ['USDC-123456', 'WEGLD-123456', 'MEX-123456'],
                pairs: [
                    new PairModel({
                        address: Address.fromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).bech32(),
                        firstToken: Tokens('WEGLD-123456'),
                        secondToken: Tokens('USDC-123456'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000000',
                            reserves1: '10000000000',
                            totalSupply: '10000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                    new PairModel({
                        address: Address.fromHex(
                            '0000000000000000000000000000000000000000000000000000000000000012',
                        ).bech32(),
                        firstToken: Tokens('WEGLD-123456'),
                        secondToken: Tokens('MEX-123456'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000000',
                            reserves1: '1000000000000000000000000',
                            totalSupply: '1000000000000000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                ],
                tolerance: 0.01,
                maxPriceDeviationPercent: 1,
                tokensPriceDeviationPercent: undefined,
            }),
        );
    });

    it('should get a wrap tx + a fixed input simple swap tx', async () => {
        const transactions = await service.getTransactions(
            Address.Zero().bech32(),
            new AutoRouteModel({
                swapType: 0,
                tokenInID: 'EGLD',
                tokenOutID: 'USDC-123456',
                tokenInExchangeRate: '4960273038901078',
                tokenOutExchangeRate: '201601805416248751341',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '200',
                amountIn: '1000000000000000000',
                amountOut: '4960273038901078',
                intermediaryAmounts: [
                    '1000000000000000000',
                    '4960273038901078',
                ],
                tokenRoute: ['USDC-123456', 'WEGLD-123456'],
                pairs: [
                    new PairModel({
                        address: Address.fromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).bech32(),
                    }),
                ],
                tolerance: 0.01,
            }),
        );
        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '1000000000000000000',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: '',
                receiverUsername: undefined,
                senderUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: gasConfig.wrapeGLD,
                data: encodeTransactionData('wrapEgld'),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
                guardian: undefined,
                guardianSignature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000013',
                ).bech32(),
                sender: '',
                receiverUsername: undefined,
                senderUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: gasConfig.pairs.swapTokensFixedInput.default,
                data: encodeTransactionData(
                    'ESDTTransfer@WEGLD-123456@01000000000000000000@swapTokensFixedInput@USDC-123456@4911161424654532',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
                guardian: undefined,
                guardianSignature: undefined,
            },
        ]);
    });

    it('should get a fixed output multi swap tx + unwrap tx', async () => {
        const transactions = await service.getTransactions(
            Address.Zero().bech32(),
            new AutoRouteModel({
                swapType: 1,
                tokenInID: 'USDC-123456',
                tokenOutID: 'EGLD',
                tokenInExchangeRate: '4962567499999999',
                tokenOutExchangeRate: '201508594089652181902',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '100',
                amountIn: '101761840015274351860',
                amountOut: '500000000000000000',
                intermediaryAmounts: [
                    '503014183917413680',
                    '626881033727',
                    '500000000000000000',
                ],
                tokenRoute: ['USDC-123456', 'WEGLD-123456', 'MEX-123456'],
                pairs: [
                    new PairModel({
                        address: Address.fromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).bech32(),
                    }),
                    new PairModel({
                        address: Address.fromHex(
                            '0000000000000000000000000000000000000000000000000000000000000012',
                        ).bech32(),
                    }),
                ],
                tolerance: 0.01,
            }),
        );
        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '0',
                receiver: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000011',
                ).bech32(),
                sender: '',
                receiverUsername: undefined,
                senderUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 2 * gasConfig.router.multiPairSwapMultiplier,
                data: encodeTransactionData(
                    `ESDTTransfer@USDC-123456@508044325756587816@multiPairSwap@${Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000013',
                    ).bech32()}@swapTokensFixedOutput@WEGLD-123456@630015438895@${Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000012',
                    ).bech32()}@swapTokensFixedOutput@MEX-123456@500000000000000000`,
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
                guardian: undefined,
                guardianSignature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: '',
                receiverUsername: undefined,
                senderUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: gasConfig.wrapeGLD,
                data: encodeTransactionData(
                    'ESDTTransfer@WEGLD-123456@500000000000000000@unwrapEgld',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
                guardian: undefined,
                guardianSignature: undefined,
            },
        ]);
    });
});
