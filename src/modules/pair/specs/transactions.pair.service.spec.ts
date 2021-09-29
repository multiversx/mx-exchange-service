import { Test, TestingModule } from '@nestjs/testing';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { RedisModule } from 'nestjs-redis';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { PairTransactionService } from '../services/pair.transactions.service';
import { PairServiceMock } from '../mocks/pair.service.mock';
import { ContextServiceMock } from 'src/services/context/context.service.mocks';
import { ContextService } from 'src/services/context/context.service';
import { PairService } from '../services/pair.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { PairGetterService } from '../services/pair.getter.service';
import { PairGetterServiceMock } from '../mocks/pair.getter.service.mock';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';

describe('TransactionPairService', () => {
    let service: PairTransactionService;

    const ElrondProxyServiceProvider = {
        provide: ElrondProxyService,
        useClass: ElrondProxyServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const PairServiceProvider = {
        provide: PairService,
        useClass: PairServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
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
                RedisModule.register([
                    {
                        host: process.env.REDIS_URL,
                        port: parseInt(process.env.REDIS_PORT),
                        password: process.env.REDIS_PASSWORD,
                    },
                ]),
            ],
            providers: [
                ElrondProxyServiceProvider,
                ContextServiceProvider,
                PairServiceProvider,
                PairGetterServiceProvider,
                WrapServiceProvider,
                TransactionsWrapService,
                PairTransactionService,
            ],
        }).compile();

        service = module.get<PairTransactionService>(PairTransactionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get add liquidity batch transaction EGLD first token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const liquidityBatchTransactions = await service.addLiquidityBatch({
            pairAddress: 'pair_address_1',
            firstTokenID: 'EGLD',
            firstTokenAmount: firstTokenAmount,
            secondTokenID: 'TOK2-2222',
            secondTokenAmount: secondTokenAmount,
            sender: 'user_address_1',
            tolerance: 0.01,
        });

        const [
            wrapEgldTransaction,
            transferfirstTokenTransaction,
            transferSecondTokenTransaction,
            addLiquidity,
        ] = liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(firstTokenAmount);
        expect(transferfirstTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDU3NDU0NzRjNDQyZDMwMzczMzM2MzUzMEAwYUA2MTYzNjM2NTcwNzQ0NTczNjQ3NDUwNjE3OTZkNjU2ZTc0',
        );
        expect(transferSecondTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDU0NGY0YjMyMmQzMjMyMzIzMkAwOUA2MTYzNjM2NTcwNzQ0NTczNjQ3NDUwNjE3OTZkNjU2ZTc0',
        );
        expect(addLiquidity.data).toEqual('YWRkTGlxdWlkaXR5QDBhQDA5QDA5QDA4');
    });

    it('should get add liquidity batch transaction EGLD second token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const liquidityBatchTransactions = await service.addLiquidityBatch({
            pairAddress: 'pair_address_1',
            firstTokenID: 'TOK2-2222',
            firstTokenAmount: firstTokenAmount,
            secondTokenID: 'EGLD',
            secondTokenAmount: secondTokenAmount,
            sender: 'user_address_1',
            tolerance: 0.01,
        });

        const [
            wrapEgldTransaction,
            transferfirstTokenTransaction,
            transferSecondTokenTransaction,
            addLiquidity,
        ] = liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(secondTokenAmount);
        expect(transferfirstTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDU3NDU0NzRjNDQyZDMwMzczMzM2MzUzMEAwOUA2MTYzNjM2NTcwNzQ0NTczNjQ3NDUwNjE3OTZkNjU2ZTc0',
        );
        expect(transferSecondTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDU0NGY0YjMyMmQzMjMyMzIzMkAwYUA2MTYzNjM2NTcwNzQ0NTczNjQ3NDUwNjE3OTZkNjU2ZTc0',
        );
        expect(addLiquidity.data).toEqual('YWRkTGlxdWlkaXR5QDA5QDBhQDA4QDA5');
    });
});
