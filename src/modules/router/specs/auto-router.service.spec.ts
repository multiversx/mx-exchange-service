import { Test, TestingModule } from '@nestjs/testing';
import { AutoRouterService } from '../services/auto-router/auto-router.service';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair.getter.service.mock';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextService } from 'src/services/context/context.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { ContextServiceMock } from 'src/services/context/mocks/context.service.mock';
import { AutoRouterComputeService } from '../services/auto-router/auto-router.compute.service';
import { TransactionRouterService } from '../services/transactions.router.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigService } from '@nestjs/config';
import { RouterGetterService } from '../services/router.getter.service';
import { RouterGetterServiceMock } from '../mocks/router.getter.service.mock';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';

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
            ],
            providers: [
                ContextServiceProvider,
                ContextGetterServiceProvider,
                PairGetterServiceProvider,
                RouterGetterServiceProvider,
                WrapServiceProvider,
                TransactionsWrapService,
                ContextTransactionsService,
                ConfigService,
                ApiConfigService,
                ElrondProxyService,
                TransactionRouterService,
                AutoRouterComputeService,
                AutoRouterService,
            ],
        }).compile();

        service = module.get<AutoRouterService>(AutoRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get exchange rate', async () => {
        const exchangeRate_0 = await service.getExchangeRate(
            'TOK1-1111',
            'TOK2-2222',
        );
        expect(exchangeRate_0).toEqual('998497746619929894');

        const exchangeRate_1 = await service.getExchangeRate(
            'TOK2-2222',
            'USDC-1111',
        );
        expect(exchangeRate_1).toEqual('49812415857744244588');
    });

    it('should get auto-route', async () => {
        const autoRoute_0 = await service.getAutoRouteFixedInput(
            'erd173spamvzs8gv0ln4e4x605t7tucg892xgt2wmgw3pmrt43mwp3ys2lqp9x',
            {
                amount: '1000000000000000000',
                tokenInID: 'USDC-1111',
                tokenOutID: 'TOK1-1111',
                tolerance: 0.01,
            },
        );
        expect(autoRoute_0).toEqual({
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK1-1111',
            amountIn: '1000000000000000000',
            amountOut: '4960273038901078',
            tokenRoute: ['USDC-1111', 'TOK1-1111'],
            intermediaryAmounts: ['1000000000000000000', '4960273038901078'],
            addressRoute: [
                'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
            ],
            tolerance: 0.01,
            transactions: [
                {
                    nonce: 0,
                    value: '0',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
                    sender:
                        'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                    gasPrice: 1000000000,
                    gasLimit: 25000000,
                    data:
                        'RVNEVFRyYW5zZmVyQDU1NTM0NDQzMmQzMTMxMzEzMUAwZGUwYjZiM2E3NjQwMDAwQDZkNzU2Yzc0Njk1MDYxNjk3MjUzNzc2MTcwQDAwMDAwMDAwMDAwMDAwMDAwNTAwMDZiZGM2MWViYmVjNzE5YjA3YjRhN2ViZmQxZmIyMTVjMDcwNmUzYzdjZWJANzM3NzYxNzA1NDZmNmI2NTZlNzM0NjY5Nzg2NTY0NDk2ZTcwNzU3NEA1NDRmNGIzMTJkMzEzMTMxMzFAMTE3MmFjZTAyNmIwYzQ=',
                    chainID: 'T',
                    version: 1,
                    options: undefined,
                    signature: undefined,
                },
            ],
        });

        const autoRoute_1 = await service.getAutoRouteFixedInput(
            'erd173spamvzs8gv0ln4e4x605t7tucg892xgt2wmgw3pmrt43mwp3ys2lqp9x',
            {
                amount: '1000000000000000000',
                tokenInID: 'USDC-1111',
                tokenOutID: 'TOK2-2222',
                tolerance: 0.01,
            },
        );
        expect(autoRoute_1).toEqual({
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK2-2222',
            amountIn: '1000000000000000000',
            amountOut: '9842111338727952',
            tokenRoute: ['USDC-1111', 'TOK1-1111', 'TOK2-2222'],
            intermediaryAmounts: [
                '1000000000000000000',
                '4960273038901078',
                '9842111338727952',
            ],
            addressRoute: [
                'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            ],
            tolerance: 0.01,
            transactions: [
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
                        'RVNEVFRyYW5zZmVyQDU1NTM0NDQzMmQzMTMxMzEzMUAwZGUwYjZiM2E3NjQwMDAwQDZkNzU2Yzc0Njk1MDYxNjk3MjUzNzc2MTcwQDAwMDAwMDAwMDAwMDAwMDAwNTAwMDZiZGM2MWViYmVjNzE5YjA3YjRhN2ViZmQxZmIyMTVjMDcwNmUzYzdjZWJANzM3NzYxNzA1NDZmNmI2NTZlNzM0NjY5Nzg2NTY0NDk2ZTcwNzU3NEA1NDRmNGIzMTJkMzEzMTMxMzFAMTE3MmFjZTAyNmIwYzRAMDAwMDAwMDAwMDAwMDAwMDA1MDBjOWY2NTc3YjBjNTY2Y2RjMjhlMGE3NmY2ZTE0ZDFiZTA3OTQwMDMzN2NlYkA3Mzc3NjE3MDU0NmY2YjY1NmU3MzQ2Njk3ODY1NjQ0OTZlNzA3NTc0QDU0NGY0YjMyMmQzMjMyMzIzMkAyMjllYjg4ZDY5MWUzZA==',
                    chainID: 'T',
                    version: 1,
                    options: undefined,
                    signature: undefined,
                },
            ],
        });

        const autoRoute_2 = await service.getAutoRouteFixedInput(
            'erd173spamvzs8gv0ln4e4x605t7tucg892xgt2wmgw3pmrt43mwp3ys2lqp9x',
            {
                amount: '9842111338727952',
                tokenInID: 'TOK2-2222',
                tokenOutID: 'USDC-1111',
                tolerance: 0.01,
            },
        );
        expect(autoRoute_2).toEqual({
            tokenInID: 'TOK2-2222',
            tokenOutID: 'USDC-1111',
            amountIn: '9842111338727952',
            amountOut: '968822333445616961',
            tokenRoute: ['TOK2-2222', 'TOK1-1111', 'USDC-1111'],
            intermediaryAmounts: [
                '9842111338727952',
                '4882338322450480',
                '968822333445616961',
            ],
            addressRoute: [
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
            ],
            tolerance: 0.01,
            transactions: [
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
                        'RVNEVFRyYW5zZmVyQDU0NGY0YjMyMmQzMjMyMzIzMkAyMmY3NTkxZTJmNGExMEA2ZDc1NmM3NDY5NTA2MTY5NzI1Mzc3NjE3MEAwMDAwMDAwMDAwMDAwMDAwMDUwMGM5ZjY1NzdiMGM1NjZjZGMyOGUwYTc2ZjZlMTRkMWJlMDc5NDAwMzM3Y2ViQDczNzc2MTcwNTQ2ZjZiNjU2ZTczNDY2OTc4NjU2NDQ5NmU3MDc1NzRANTQ0ZjRiMzEyZDMxMzEzMTMxQDExMmM3ZWYxZDgzMGE5QDAwMDAwMDAwMDAwMDAwMDAwNTAwMDZiZGM2MWViYmVjNzE5YjA3YjRhN2ViZmQxZmIyMTVjMDcwNmUzYzdjZWJANzM3NzYxNzA1NDZmNmI2NTZlNzM0NjY5Nzg2NTY0NDk2ZTcwNzU3NEA1NTUzNDQ0MzJkMzEzMTMxMzFAMGQ0ZmRlYTIwNWFjOWYyZQ==',
                    chainID: 'T',
                    version: 1,
                    options: undefined,
                    signature: undefined,
                },
            ],
        });
    });
});
