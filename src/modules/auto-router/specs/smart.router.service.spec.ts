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
import {
    AutoRouteModel,
    SmartSwapModel,
    SmartSwapRoute,
} from '../models/auto-route.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { Address } from '@multiversx/sdk-core';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { RemoteConfigGetterServiceMock } from 'src/modules/remote-config/mocks/remote-config.getter.mock';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { PairsData, Tokens } from 'src/modules/pair/mocks/pair.constants';
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
import { TokenComputeServiceProvider } from 'src/modules/tokens/mocks/token.compute.service.mock';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { SmartRouterEvaluationServiceProvider } from 'src/modules/smart-router-evaluation/mocks/smart.router.evaluation.service.mock';
import { SmartRouterService } from '../services/smart.router.service';
import { BinaryUtils } from '@multiversx/sdk-nestjs-common';
import { ComposableTasksAbiServiceProvider } from 'src/modules/composable-tasks/mocks/composable.tasks.abi.service.mock';

describe('SmartRouterService', () => {
    let autoRouterService: AutoRouterService;
    let smartRouterService: SmartRouterService;
    const senderAddress = Address.newFromHex(
        '0000000000000000000000000000000000000000000000000000000000000001',
    ).toBech32();

    const testPairs: Record<string, string> = {
        'WEGLD-USDC':
            '0000000000000000000000000000000000000000000000000000000000000013',
        'WEGLD-TOK5':
            '0000000000000000000000000000000000000000000000000000000000000015',
        'TOK5-USDC':
            '0000000000000000000000000000000000000000000000000000000000000017',
        'TOK5-USDT':
            '0000000000000000000000000000000000000000000000000000000000000018',
        'WEGLD-USDT':
            '0000000000000000000000000000000000000000000000000000000000000019',
    };

    const availablePairs = formatTestPairs(testPairs);

    const expectedAutoRouteWithoutSmartSwap = new AutoRouteModel({
        swapType: 0,
        tokenInID: 'WEGLD-123456',
        tokenOutID: 'TOK5-123456',
        tokenInExchangeRate: '98715803439706129885',
        tokenOutExchangeRate: '10130090270812437',
        tokenInExchangeRateDenom: '98.715803439706129885',
        tokenOutExchangeRateDenom: '0.010130090270812437',
        tokenInPriceUSD: '10',
        tokenOutPriceUSD: '0.1',
        amountIn: '10000000000000000000',
        amountOut: '987158034397061298850',
        intermediaryAmounts: ['10000000000000000000', '987158034397061298850'],
        tokenRoute: ['WEGLD-123456', 'TOK5-123456'],
        pairs: [availablePairs['WEGLD-TOK5']],
        tolerance: 0.01,
        maxPriceDeviationPercent: 1,
        tokensPriceDeviationPercent: 0.012841965602938701,
        parallelRouteSwap: {
            allocations: [
                {
                    inputAmount: '8368596519286167298',
                    outputAmount: '827445290859189884679',
                    addressRoute: [availablePairs['WEGLD-TOK5'].address],
                    tokenRoute: ['WEGLD-123456', 'TOK5-123456'],
                    intermediaryAmounts: [
                        '8368596519286167298',
                        '827445290859189884679',
                    ],
                },
                {
                    inputAmount: '1630716449058507533',
                    outputAmount: '160187325430122183931',
                    addressRoute: [
                        availablePairs['WEGLD-USDT'].address,
                        availablePairs['TOK5-USDT'].address,
                    ],
                    tokenRoute: ['WEGLD-123456', 'USDT-123456', 'TOK5-123456'],
                    intermediaryAmounts: [
                        '1630716449058507533',
                        '16231852',
                        '160187325430122183931',
                    ],
                },
                {
                    inputAmount: '687031655325169',
                    outputAmount: '67821414657616951',
                    addressRoute: [
                        availablePairs['WEGLD-USDC'].address,
                        availablePairs['TOK5-USDC'].address,
                    ],
                    tokenRoute: ['WEGLD-123456', 'USDC-123456', 'TOK5-123456'],
                    intermediaryAmounts: [
                        '687031655325169',
                        '6849',
                        '67821414657616951',
                    ],
                },
            ],
            totalResult: '987700437703969685561',
        },
        smartSwap: undefined,
    });

    const expectedAutoRouteWithSmartSwap = new AutoRouteModel({
        swapType: 0,
        tokenInID: 'WEGLD-123456',
        tokenOutID: 'TOK5-123456',
        tokenInExchangeRate: '95876447282378736008',
        tokenOutExchangeRate: '10430090270812437',
        tokenInExchangeRateDenom: '95.876447282378736008',
        tokenOutExchangeRateDenom: '0.010430090270812437',
        tokenInPriceUSD: '10',
        tokenOutPriceUSD: '0.1',
        amountIn: '40000000000000000000',
        amountOut: '3835057891295149440320',
        intermediaryAmounts: ['40000000000000000000', '3835057891295149440320'],
        tokenRoute: ['WEGLD-123456', 'TOK5-123456'],
        pairs: [availablePairs['WEGLD-TOK5']],
        tolerance: 0.01,
        maxPriceDeviationPercent: 1,
        tokensPriceDeviationPercent: 0.04123552717621264,
        parallelRouteSwap: {
            allocations: [
                {
                    inputAmount: '24108414923882484173',
                    outputAmount: '2347191658708309820865',
                    addressRoute: [availablePairs['WEGLD-TOK5'].address],
                    tokenRoute: ['WEGLD-123456', 'TOK5-123456'],
                    intermediaryAmounts: [
                        '24108414923882484173',
                        '2347191658708309820865',
                    ],
                },
                {
                    inputAmount: '15889321853942518164',
                    outputAmount: '1536845271387162676128',
                    addressRoute: [
                        availablePairs['WEGLD-USDT'].address,
                        availablePairs['TOK5-USDT'].address,
                    ],
                    tokenRoute: ['WEGLD-123456', 'USDT-123456', 'TOK5-123456'],
                    intermediaryAmounts: [
                        '15889321853942518164',
                        '155946094',
                        '1536845271387162676128',
                    ],
                },
                {
                    inputAmount: '2263222174997663',
                    outputAmount: '220013586591845180',
                    addressRoute: [
                        availablePairs['WEGLD-USDC'].address,
                        availablePairs['TOK5-USDC'].address,
                    ],
                    tokenRoute: ['WEGLD-123456', 'USDC-123456', 'TOK5-123456'],
                    intermediaryAmounts: [
                        '2263222174997663',
                        '22564',
                        '220013586591845180',
                    ],
                },
            ],
            totalResult: '3884256943682064342173',
        },
        smartSwap: new SmartSwapModel({
            amountOut: '3864835658963654020462',
            routes: [
                new SmartSwapRoute({
                    fees: ['0.072325244771647452519'],
                    intermediaryAmounts: [
                        '24108414923882484173',
                        '2347191658708309820865',
                    ],
                    pairs: [availablePairs['WEGLD-TOK5']],
                    pricesImpact: ['2.34719165870830982'],
                    tokenRoute: ['WEGLD-123456', 'TOK5-123456'],
                }),
                new SmartSwapRoute({
                    fees: ['0.047667965561827554492', '0.467838282'],
                    intermediaryAmounts: [
                        '15889321853942518164',
                        '155946094',
                        '1536845271387162676128',
                    ],
                    pairs: [
                        availablePairs['WEGLD-USDT'],
                        availablePairs['TOK5-USDT'],
                    ],
                    pricesImpact: ['1.55946094', '0.155236896099713401'],
                    tokenRoute: ['WEGLD-123456', 'USDT-123456', 'TOK5-123456'],
                }),
                new SmartSwapRoute({
                    fees: ['0.000006789666524992989', '0.000067692'],
                    intermediaryAmounts: [
                        '2263222174997663',
                        '22564',
                        '220013586591845180',
                    ],
                    pairs: [
                        availablePairs['WEGLD-USDC'],
                        availablePairs['TOK5-USDC'],
                    ],
                    pricesImpact: ['0.00022564', '2.2001358659184518'],
                    tokenRoute: ['WEGLD-123456', 'USDC-123456', 'TOK5-123456'],
                }),
            ],
            tokenInExchangeRate: '97106423592051608554',
            tokenInExchangeRateDenom: '97.106423592051608554',
            tokenOutExchangeRate: '10297979917384707',
            tokenOutExchangeRateDenom: '0.010297979917384707',
            tokensPriceDeviationPercent: 0.02640150083732185,
            feeAmount: '19421284718410321710',
            feePercentage: 0.005,
        }),
    });

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
                SmartRouterService,
                SmartRouterEvaluationServiceProvider,
                ComposableTasksAbiServiceProvider,
            ],
            exports: [],
        }).compile();

        autoRouterService = module.get<AutoRouterService>(AutoRouterService);
        smartRouterService = module.get<SmartRouterService>(SmartRouterService);
    });

    it('should be defined', () => {
        expect(autoRouterService).toBeDefined();
        expect(smartRouterService).toBeDefined();
    });

    it('should get parallel route data without smart swap (threshold not met)', async () => {
        const swap = await autoRouterService.swap({
            amountIn: '10000000000000000000',
            tokenInID: 'WEGLD-123456',
            tokenOutID: 'TOK5-123456',
            tolerance: 0.01,
        });

        expect(swap).toEqual(expectedAutoRouteWithoutSmartSwap);
    });

    it('should get parallel route data with smart swap', async () => {
        const swap = await autoRouterService.swap({
            amountIn: '40000000000000000000',
            tokenInID: 'WEGLD-123456',
            tokenOutID: 'TOK5-123456',
            tolerance: 0.01,
        });

        expect(swap).toEqual(expectedAutoRouteWithSmartSwap);
    });

    it('should get a wrap tx + a fixed input simple swap tx', async () => {
        const autoRouteModel = new AutoRouteModel({
            ...expectedAutoRouteWithoutSmartSwap,
            tokenInID: 'EGLD',
        });
        const transactions = await autoRouterService.getTransactions(
            senderAddress,
            autoRouteModel,
        );

        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '10000000000000000000',
                receiver: Address.Zero().toBech32(),
                sender: senderAddress,
                receiverUsername: undefined,
                senderUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 39000000,
                data: 'Y29tcG9zZVRhc2tzQDAwMDAwMDBiNTQ0ZjRiMzUyZDMxMzIzMzM0MzUzNjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwOTM0ZmJlZTMwYTY3M2I4YWU5YkBAQDAyQDAwMDAwMDE0NzM3NzYxNzA1NDZmNmI2NTZlNzM0NjY5Nzg2NTY0NDk2ZTcwNzU3NDAwMDAwMDBiNTQ0ZjRiMzUyZDMxMzIzMzM0MzUzNjAwMDAwMDA5MzRmYmVlMzBhNjczYjhhZTli',
                chainID: 'T',
                version: 2,
                options: undefined,
                signature: undefined,
                guardian: undefined,
                guardianSignature: undefined,
            },
        ]);
    });

    it('should get a wrap tx + a multi route (smart) swap tx', async () => {
        const autoRouteModel = new AutoRouteModel({
            ...expectedAutoRouteWithSmartSwap,
            tokenInID: 'EGLD',
        });
        const transactions = await autoRouterService.getTransactions(
            senderAddress,
            autoRouteModel,
        );

        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '40000000000000000000',
                receiver: Address.Zero().toBech32(),
                sender: senderAddress,
                receiverUsername: undefined,
                senderUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 141500000,
                data: BinaryUtils.base64Encode(
                    'composeTasks@0000000b544f4b352d313233343536000000000000000000000009cf6851fbf1ca346f10@@@05@000000010300000009014e924ba433bdd1cd00000001010000002000000000000000000000000000000000000000000000000000000000000000150000001473776170546f6b656e734669786564496e7075740000000b544f4b352d313233343536000000097df816e9dd4a06dd6000000008dc82360a7a18519400000001020000002000000000000000000000000000000000000000000000000000000000000000190000001473776170546f6b656e734669786564496e7075740000000b555344542d313233343536000000040933c0c90000002000000000000000000000000000000000000000000000000000000000000000180000001473776170546f6b656e734669786564496e7075740000000b544f4b352d3132333435360000000952e55f5c9ccfc7a29b00000007080a6379c9dc9f00000001020000002000000000000000000000000000000000000000000000000000000000000000130000001473776170546f6b656e734669786564496e7075740000000b555344432d3132333435360000000257420000002000000000000000000000000000000000000000000000000000000000000000170000001473776170546f6b656e734669786564496e7075740000000b544f4b352d313233343536000000080309bcaf74319942',
                ),
                chainID: 'T',
                version: 2,
                options: undefined,
                signature: undefined,
                guardian: undefined,
                guardianSignature: undefined,
            },
        ]);
    });

    it('should throw an error when spread is too big', async () => {
        const autoRouteModel = new AutoRouteModel({
            ...expectedAutoRouteWithSmartSwap,
            maxPriceDeviationPercent: 0.02,
            tokenInID: 'EGLD',
        });

        await expect(
            autoRouterService.getTransactions(senderAddress, autoRouteModel),
        ).rejects.toThrow('Spread too big!');
    });
});

function formatTestPairs(
    testPairs: Record<string, string>,
): Record<string, PairModel> {
    const pairs: Record<string, PairModel> = {};

    for (const [pair, addressHex] of Object.entries(testPairs)) {
        const { address, firstToken, secondToken, info, totalFeePercent } =
            PairsData(Address.newFromHex(addressHex).toBech32());

        pairs[pair] = new PairModel({
            address,
            firstToken: new EsdtToken({
                identifier: Tokens(firstToken.identifier).identifier,
                decimals: Tokens(firstToken.identifier).decimals,
            }),
            secondToken: new EsdtToken({
                identifier: Tokens(secondToken.identifier).identifier,
                decimals: Tokens(secondToken.identifier).decimals,
            }),
            info,
            totalFeePercent,
        });
    }

    return pairs;
}
