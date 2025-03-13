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
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WrapService } from 'src/modules/wrapping/services/wrap.service';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { ConfigModule } from '@nestjs/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { ComposableTasksTransactionService } from 'src/modules/composable-tasks/services/composable.tasks.transaction';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { PairFilteringService } from 'src/modules/pair/services/pair.filtering.service';
import { gasConfig, scAddress } from 'src/config';
import { TokenComputeServiceProvider } from 'src/modules/tokens/mocks/token.compute.service.mock';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

describe('AutoRouterService', () => {
    let service: AutoRouterService;
    const senderAddress = Address.newFromHex(
        '0000000000000000000000000000000000000000000000000000000000000001',
    ).toBech32();

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
                TokenComputeServiceProvider,
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
                ComposableTasksTransactionService,
                ApiConfigService,
                MXApiServiceProvider,
                PairFilteringService,
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
                        address: Address.newFromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).toBech32(),
                        firstToken: new EsdtToken({
                            identifier: Tokens('WEGLD-123456').identifier,
                            decimals: Tokens('WEGLD-123456').decimals,
                        }),
                        secondToken: new EsdtToken({
                            identifier: Tokens('USDC-123456').identifier,
                            decimals: Tokens('USDC-123456').decimals,
                        }),
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
                        address: Address.newFromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).toBech32(),
                        firstToken: new EsdtToken({
                            identifier: Tokens('WEGLD-123456').identifier,
                            decimals: Tokens('WEGLD-123456').decimals,
                        }),
                        secondToken: new EsdtToken({
                            identifier: Tokens('USDC-123456').identifier,
                            decimals: Tokens('USDC-123456').decimals,
                        }),
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
                        address: Address.newFromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).toBech32(),
                        firstToken: new EsdtToken({
                            identifier: Tokens('WEGLD-123456').identifier,
                            decimals: Tokens('WEGLD-123456').decimals,
                        }),
                        secondToken: new EsdtToken({
                            identifier: Tokens('USDC-123456').identifier,
                            decimals: Tokens('USDC-123456').decimals,
                        }),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000000',
                            reserves1: '10000000000',
                            totalSupply: '10000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                    new PairModel({
                        address: Address.newFromHex(
                            '0000000000000000000000000000000000000000000000000000000000000012',
                        ).toBech32(),
                        firstToken: new EsdtToken({
                            identifier: Tokens('WEGLD-123456').identifier,
                            decimals: Tokens('WEGLD-123456').decimals,
                        }),
                        secondToken: new EsdtToken({
                            identifier: Tokens('MEX-123456').identifier,
                            decimals: Tokens('MEX-123456').decimals,
                        }),
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
            senderAddress,
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
                        address: Address.newFromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).toBech32(),
                    }),
                ],
                tolerance: 0.01,
            }),
        );
        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '1000000000000000000',
                receiver: Address.Zero().toBech32(),
                sender: senderAddress,
                receiverUsername: undefined,
                senderUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 40200000,
                data: 'Y29tcG9zZVRhc2tzQDAwMDAwMDBiNTU1MzQ0NDMyZDMxMzIzMzM0MzUzNjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwNzExNzJhY2UwMjZiMGM0QEBAMDJAMDAwMDAwMTQ3Mzc3NjE3MDU0NmY2YjY1NmU3MzQ2Njk3ODY1NjQ0OTZlNzA3NTc0MDAwMDAwMGI1NTUzNDQ0MzJkMzEzMjMzMzQzNTM2MDAwMDAwMDcxMTcyYWNlMDI2YjBjNA==',
                chainID: 'T',
                version: 2,
                options: undefined,
                signature: undefined,
                guardian: undefined,
                guardianSignature: undefined,
            },
        ]);
    });

    it('should get a fixed output multi swap tx + unwrap tx', async () => {
        const transactions = await service.getTransactions(
            senderAddress,
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
                        address: Address.newFromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).toBech32(),
                    }),
                    new PairModel({
                        address: Address.newFromHex(
                            '0000000000000000000000000000000000000000000000000000000000000012',
                        ).toBech32(),
                    }),
                ],
                tolerance: 0.01,
            }),
        );
        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '0',
                receiver: Address.Zero().toBech32(),
                sender: senderAddress,
                receiverUsername: undefined,
                senderUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 75200000,
                data: 'RVNEVFRyYW5zZmVyQDU1NTM0NDQzMmQzMTMyMzMzNDM1MzZAMDcwY2VmOWY1ZWRmY2YyOEA2MzZmNmQ3MDZmNzM2NTU0NjE3MzZiNzNAMDAwMDAwMDQ0NTQ3NGM0NDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwODA2ZjA1YjU5ZDNiMjAwMDBAMDNAMDAwMDAwMjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDEzMDAwMDAwMTU3Mzc3NjE3MDU0NmY2YjY1NmU3MzQ2Njk3ODY1NjQ0Zjc1NzQ3MDc1NzQwMDAwMDAwYzU3NDU0NzRjNDQyZDMxMzIzMzM0MzUzNjAwMDAwMDA1OTJhZmQ4YjAyZjAwMDAwMDIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAxMjAwMDAwMDE1NzM3NzYxNzA1NDZmNmI2NTZlNzM0NjY5Nzg2NTY0NGY3NTc0NzA3NTc0MDAwMDAwMGE0ZDQ1NTgyZDMxMzIzMzM0MzUzNjAwMDAwMDA4MDZmMDViNTlkM2IyMDAwMEAwMUA=',
                chainID: 'T',
                version: 2,
                options: undefined,
                signature: undefined,
                guardian: undefined,
                guardianSignature: undefined,
            },
        ]);
    });

    it('should get a fixed output multi swap tx', async () => {
        const transactions = await service.getTransactions(
            senderAddress,
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
                        address: Address.newFromHex(
                            '0000000000000000000000000000000000000000000000000000000000000013',
                        ).toBech32(),
                    }),
                    new PairModel({
                        address: Address.newFromHex(
                            '0000000000000000000000000000000000000000000000000000000000000012',
                        ).toBech32(),
                    }),
                ],
                tolerance: 0.01,
            }),
        );

        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '0',
                receiver: scAddress.routerAddress,
                sender: senderAddress,
                receiverUsername: undefined,
                senderUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: gasConfig.router.multiPairSwapMultiplier * 2,
                data: 'RVNEVFRyYW5zZmVyQDU1NTM0NDQzMmQzMTMyMzMzNDM1MzZAOWI1YTkzQDZkNzU2Yzc0Njk1MDYxNjk3MjUzNzc2MTcwQDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMTNANzM3NzYxNzA1NDZmNmI2NTZlNzM0NjY5Nzg2NTY0NGY3NTc0NzA3NTc0QDU3NDU0NzRjNDQyZDMxMzIzMzM0MzUzNkAwZTAwY2U0MzYxNTM1MGQyQDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMTJANzM3NzYxNzA1NDZmNmI2NTZlNzM0NjY5Nzg2NTY0NGY3NTc0NzA3NTc0QDRkNDU1ODJkMzEzMjMzMzQzNTM2QDM2MzVjOWFkYzVkZWEwMDAwMA==',
                chainID: 'T',
                version: 2,
                options: undefined,
                signature: undefined,
                guardian: undefined,
                guardianSignature: undefined,
            },
        ]);
    });
});
