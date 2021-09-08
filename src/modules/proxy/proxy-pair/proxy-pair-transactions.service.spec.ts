import { Test, TestingModule } from '@nestjs/testing';
import { RedlockService } from '../../../services';
import {
    ContextServiceMock,
    RedlockServiceMock,
    WrapServiceMock,
} from '../../pair/pair.test-constants';
import { ContextService } from '../../../services/context/context.service';
import { WrapService } from '../../wrapping/wrap.service';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { RedisModule } from 'nestjs-redis';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { TransactionsWrapService } from '../../wrapping/transactions-wrap.service';
import { PairServiceMock } from '../../pair/pair.service.mock';
import { TransactionsProxyPairService } from './proxy-pair-transactions.service';
import { PairService } from '../../pair/pair.service';

describe('TransactionProxyPairService', () => {
    let service: TransactionsProxyPairService;
    let elrondProxy: ElrondProxyService;

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const RedlockServiceProvider = {
        provide: RedlockService,
        useClass: RedlockServiceMock,
    };

    const PairServiceProvider = {
        provide: PairService,
        useClass: PairServiceMock,
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
                ElrondProxyService,
                ContextServiceProvider,
                RedlockServiceProvider,
                PairServiceProvider,
                WrapServiceProvider,
                TransactionsWrapService,
                TransactionsProxyPairService,
            ],
        }).compile();

        service = module.get<TransactionsProxyPairService>(
            TransactionsProxyPairService,
        );
        elrondProxy = module.get<ElrondProxyService>(ElrondProxyService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get add liquidity batch transaction EGLD first token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        jest.spyOn(elrondProxy, 'getAddressShardID').mockImplementation(
            async () => 0,
        );
        const liquidityBatchTransactions = await service.addLiquidityProxyBatch(
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww',
                firstTokenID: 'EGLD',
                firstTokenAmount: firstTokenAmount,
                secondTokenID: 'LKMEX-1234',
                secondTokenNonce: 1,
                secondTokenAmount: secondTokenAmount,
                sender: 'user_address_1',
                tolerance: 0.01,
            },
        );

        const [
            wrapEgldTransaction,
            transferfirstTokenTransaction,
            transferSecondTokenTransaction,
            addLiquidity,
        ] = liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(firstTokenAmount);
        expect(transferfirstTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDU3NDU0NzRjNDQyZDMxMzEzMTMxQDBhQDYxNjM2MzY1NzA3NDQ1NzM2NDc0NTA2MTc5NmQ2NTZlNzQ1MDcyNmY3ODc5QDAwMDAwMDAwMDAwMDAwMDAwNTAwMjJmZGMyZjUyNDdiNGE0MGY5ZTNmYTNjMjljMDJmZTNlNDcxMTgxYTdjZWI=',
        );
        expect(transferSecondTokenTransaction.data).toEqual(
            'RVNEVE5GVFRyYW5zZmVyQDRjNGI0ZDQ1NTgyZDMxMzIzMzM0QDAxQDA5QDAwMDAwMDAwMDAwMDAwMDAwNTAwMDMxNzNlNzQwNDFkYTU1MGZmMmRkMTkxYzc1YTk1MDRhY2ZiZTU3ZDdjZWJANjE2MzYzNjU3MDc0NDU3MzY0NzQ1MDYxNzk2ZDY1NmU3NDUwNzI2Zjc4NzlAMDAwMDAwMDAwMDAwMDAwMDA1MDAyMmZkYzJmNTI0N2I0YTQwZjllM2ZhM2MyOWMwMmZlM2U0NzExODFhN2NlYg==',
        );
        expect(addLiquidity.data).toEqual(
            'YWRkTGlxdWlkaXR5UHJveHlAMDAwMDAwMDAwMDAwMDAwMDA1MDAyMmZkYzJmNTI0N2I0YTQwZjllM2ZhM2MyOWMwMmZlM2U0NzExODFhN2NlYkA1NzQ1NDc0YzQ0MmQzMTMxMzEzMUBAMGFAMDlANGM0YjRkNDU1ODJkMzEzMjMzMzRAMDFAMDlAMDg=',
        );
    });

    it('should get add liquidity batch transaction EGLD second token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        jest.spyOn(elrondProxy, 'getAddressShardID').mockImplementation(
            async () => 0,
        );
        const liquidityBatchTransactions = await service.addLiquidityProxyBatch(
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww',
                firstTokenID: 'LKMEX-1234',
                firstTokenNonce: 1,
                firstTokenAmount: firstTokenAmount,
                secondTokenID: 'EGLD',
                secondTokenAmount: secondTokenAmount,
                sender: 'user_address_1',
                tolerance: 0.01,
            },
        );

        const [
            wrapEgldTransaction,
            transferfirstTokenTransaction,
            transferSecondTokenTransaction,
            addLiquidity,
        ] = liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(secondTokenAmount);
        expect(transferfirstTokenTransaction.data).toEqual(
            'RVNEVE5GVFRyYW5zZmVyQDRjNGI0ZDQ1NTgyZDMxMzIzMzM0QDAxQDBhQDAwMDAwMDAwMDAwMDAwMDAwNTAwMDMxNzNlNzQwNDFkYTU1MGZmMmRkMTkxYzc1YTk1MDRhY2ZiZTU3ZDdjZWJANjE2MzYzNjU3MDc0NDU3MzY0NzQ1MDYxNzk2ZDY1NmU3NDUwNzI2Zjc4NzlAMDAwMDAwMDAwMDAwMDAwMDA1MDAyMmZkYzJmNTI0N2I0YTQwZjllM2ZhM2MyOWMwMmZlM2U0NzExODFhN2NlYg==',
        );
        expect(transferSecondTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDU3NDU0NzRjNDQyZDMxMzEzMTMxQDA5QDYxNjM2MzY1NzA3NDQ1NzM2NDc0NTA2MTc5NmQ2NTZlNzQ1MDcyNmY3ODc5QDAwMDAwMDAwMDAwMDAwMDAwNTAwMjJmZGMyZjUyNDdiNGE0MGY5ZTNmYTNjMjljMDJmZTNlNDcxMTgxYTdjZWI=',
        );
        expect(addLiquidity.data).toEqual(
            'YWRkTGlxdWlkaXR5UHJveHlAMDAwMDAwMDAwMDAwMDAwMDA1MDAyMmZkYzJmNTI0N2I0YTQwZjllM2ZhM2MyOWMwMmZlM2U0NzExODFhN2NlYkA1NzQ1NDc0YzQ0MmQzMTMxMzEzMUBAMDlAMDhANGM0YjRkNDU1ODJkMzEzMjMzMzRAMDFAMGFAMDk=',
        );
    });
});
