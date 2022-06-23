import { Test, TestingModule } from '@nestjs/testing';
import { AutoRouterService } from '../services/auto-router.service';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair.getter.service.mock';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextService } from 'src/services/context/context.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { ContextServiceMock } from 'src/services/context/mocks/context.service.mock';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { AutoRouterComputeService } from '../services/auto-router.compute.service';
import { AutoRouterTransactionService } from '../services/auto-router.transactions.service';
import { PairTransactionService } from 'src/modules/pair/services/pair.transactions.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { RouterGetterServiceMock } from 'src/modules/router/mocks/router.getter.service.mock';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TransactionRouterService } from 'src/modules/router/services/transactions.router.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { RouterService } from 'src/modules/router/services/router.service';
import { AutoRouteModel } from '../models/auto-route.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { Address } from '@elrondnetwork/erdjs/out';

describe('AutoRouterService', () => {
    let service: AutoRouterService;

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const RouterGetterServiceProvider = {
        provide: RouterGetterService,
        useClass: RouterGetterServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    const ElrondProxyServiceProvider = {
        provide: ElrondProxyService,
        useClass: ElrondProxyServiceMock,
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
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                CommonAppModule,
                CachingModule,
            ],
            providers: [
                RouterService,
                RouterGetterServiceProvider,
                ContextServiceProvider,
                ContextGetterServiceProvider,
                ElrondProxyServiceProvider,
                PairGetterServiceProvider,
                PairService,
                PairTransactionService,
                WrapServiceProvider,
                TransactionsWrapService,
                TransactionRouterService,
                AutoRouterService,
                AutoRouterComputeService,
                AutoRouterTransactionService,
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
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK1-1111',
            tolerance: 0.01,
        });
        expect(swap).toEqual({
            swapType: 0,
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK1-1111',
            tokenInExchangeRate: '4960273038901078',
            tokenOutExchangeRate: '201601805416248751341',
            tokenInExchangeRateDenom: '0.004960273038901078',
            tokenOutExchangeRateDenom: '201.601805416248751341',
            tokenInPriceUSD: '1',
            tokenOutPriceUSD: '200',
            amountIn: '1000000000000000000',
            amountOut: '4960273038901078',
            intermediaryAmounts: ['1000000000000000000', '4960273038901078'],
            tokenRoute: ['USDC-1111', 'TOK1-1111'],
            fees: ['0.003'],
            pricesImpact: ['0.4960273038901078'],
            pairs: [
                {
                    address:
                        'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                },
            ],
            tolerance: 0.01,
        });
    });

    it('should get swap data for simple swap with amountIn', async () => {
        const swap = await service.swap({
            amountIn: '2000000000000000000',
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK1-1111',
            tolerance: 0.01,
        });
        expect(swap).toEqual({
            swapType: 0,
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK1-1111',
            tokenInExchangeRate: '4935790171985306',
            tokenOutExchangeRate: '202601805416248766526',
            tokenInExchangeRateDenom: '0.004935790171985306',
            tokenOutExchangeRateDenom: '202.601805416248766526',
            tokenInPriceUSD: '1',
            tokenOutPriceUSD: '200',
            amountIn: '2000000000000000000',
            amountOut: '9871580343970612',
            intermediaryAmounts: ['2000000000000000000', '9871580343970612'],
            tokenRoute: ['USDC-1111', 'TOK1-1111'],
            fees: ['0.006'],
            pricesImpact: ['0.9871580343970612'],
            pairs: [
                {
                    address:
                        'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                },
            ],
            tolerance: 0.01,
        });
    });

    it('should get swap data for multi swap with amountOut', async () => {
        const swap = await service.swap({
            amountOut: '500000000000000000',
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK2-2222',
            tolerance: 0.01,
        });
        expect(swap).toEqual({
            swapType: 1,
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK2-2222',
            tokenInExchangeRate: '4962567499999999',
            tokenOutExchangeRate: '201508594089652181902',
            tokenInExchangeRateDenom: '0.004962567499999999',
            tokenOutExchangeRateDenom: '201.508594089652181902',
            tokenInPriceUSD: '1',
            tokenOutPriceUSD: '100',
            amountIn: '101761840015274351860',
            amountOut: '500000000000000000',
            intermediaryAmounts: [
                '100754297044826090951',
                '334336342360414578',
                '500000000000000000',
            ],
            tokenRoute: ['USDC-1111', 'TOK1-1111', 'TOK2-2222'],
            fees: ['0.302262891134478272853', '0.001003009027081243734'],
            pricesImpact: ['33.4336342360414578', '25'],
            pairs: [
                {
                    address:
                        'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                },
                {
                    address:
                        'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                },
            ],
            tolerance: 0.01,
        });
    });

    it('should get a wrap tx + a fixed input simple swap tx', async () => {
        const transactions = await service.getTransactions(
            Address.Zero().bech32(),
            new AutoRouteModel({
                swapType: 0,
                tokenInID: 'EGLD',
                tokenOutID: 'TOK1-1111',
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
                tokenRoute: ['USDC-1111', 'TOK1-1111'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
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
                sender:
                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: 4200000,
                data: 'd3JhcEVnbGQ=',
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                sender:
                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: 25500000,
                data:
                    'RVNEVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUAwZGUwYjZiM2E3NjQwMDAwQDczNzc2MTcwNTQ2ZjZiNjU2ZTczNDY2OTc4NjU2NDQ5NmU3MDc1NzRANTQ0ZjRiMzEyZDMxMzEzMTMxQDExNzJhY2UwMjZiMGM0',
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
        ]);
    });

    it('should get a fixed output multi swap tx + unwrap tx', async () => {
        const transactions = await service.getTransactions(
            Address.Zero().bech32(),
            new AutoRouteModel({
                swapType: 1,
                tokenInID: 'USDC-1111',
                tokenOutID: 'EGLD',
                tokenInExchangeRate: '4962567499999999',
                tokenOutExchangeRate: '201508594089652181902',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '100',
                amountIn: '101761840015274351860',
                amountOut: '500000000000000000',
                intermediaryAmounts: [
                    '100754297044826090951',
                    '334336342360414578',
                    '500000000000000000',
                ],
                tokenRoute: ['USDC-1111', 'TOK1-1111', 'TOK2-2222'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                    }),
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                    }),
                ],
                tolerance: 0.01,
            }),
        );
        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
                sender:
                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: 50000000,
                data:
                    'RVNEVFRyYW5zZmVyQDU1NTM0NDQzMmQzMTMxMzEzMUAwNTg0M2FhZTU2Mjg4ZjFjZjRANmQ3NTZjNzQ2OTUwNjE2OTcyNTM3NzYxNzBAMDAwMDAwMDAwMDAwMDAwMDA1MDAwNmJkYzYxZWJiZWM3MTliMDdiNGE3ZWJmZDFmYjIxNWMwNzA2ZTNjN2NlYkA3Mzc3NjE3MDU0NmY2YjY1NmU3MzQ2Njk3ODY1NjQ0Zjc1NzQ3MDc1NzRANTQ0ZjRiMzEyZDMxMzEzMTMxQDA0YTliZDg0ODQ4MTYwNGFAMDAwMDAwMDAwMDAwMDAwMDA1MDBjOWY2NTc3YjBjNTY2Y2RjMjhlMGE3NmY2ZTE0ZDFiZTA3OTQwMDMzN2NlYkA3Mzc3NjE3MDU0NmY2YjY1NmU3MzQ2Njk3ODY1NjQ0Zjc1NzQ3MDc1NzRANTQ0ZjRiMzIyZDMyMzIzMjMyQDA2ZjA1YjU5ZDNiMjAwMDA=',
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender:
                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: 4200000,
                data:
                    'RVNEVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUAwNmYwNWI1OWQzYjIwMDAwQDc1NmU3NzcyNjE3MDQ1Njc2YzY0',
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
        ]);
    });
});
