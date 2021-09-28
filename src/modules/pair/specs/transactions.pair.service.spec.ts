import { Test, TestingModule } from '@nestjs/testing';
import { RedlockService } from '../../services';
import { PairService } from './pair.service';
import { RedlockServiceMock, WrapServiceMock } from './pair.test-constants';
import { ContextService } from '../../services/context/context.service';
import { WrapService } from '../wrapping/wrap.service';
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

describe('TransactionPairService', () => {
    let service: PairTransactionService;
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
                PairTransactionService,
            ],
        }).compile();

        service = module.get<PairTransactionService>(PairTransactionService);
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
        const liquidityBatchTransactions = await service.addLiquidityBatch({
            pairAddress:
                'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww',
            firstTokenID: 'EGLD',
            firstTokenAmount: firstTokenAmount,
            secondTokenID: 'MEX-1234',
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
            'RVNEVFRyYW5zZmVyQDU3NDU0NzRjNDQyZDMxMzEzMTMxQDBhQDYxNjM2MzY1NzA3NDQ1NzM2NDc0NTA2MTc5NmQ2NTZlNzQ=',
        );
        expect(transferSecondTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDRkNDU1ODJkMzEzMjMzMzRAMDlANjE2MzYzNjU3MDc0NDU3MzY0NzQ1MDYxNzk2ZDY1NmU3NA==',
        );
        expect(addLiquidity.data).toEqual('YWRkTGlxdWlkaXR5QDBhQDA5QDA5QDA4');
    });

    it('should get add liquidity batch transaction EGLD second token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        jest.spyOn(elrondProxy, 'getAddressShardID').mockImplementation(
            async () => 0,
        );
        const liquidityBatchTransactions = await service.addLiquidityBatch({
            pairAddress:
                'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww',
            firstTokenID: 'MEX-1234',
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
            'RVNEVFRyYW5zZmVyQDU3NDU0NzRjNDQyZDMxMzEzMTMxQDA5QDYxNjM2MzY1NzA3NDQ1NzM2NDc0NTA2MTc5NmQ2NTZlNzQ=',
        );
        expect(transferSecondTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDRkNDU1ODJkMzEzMjMzMzRAMGFANjE2MzYzNjU3MDc0NDU3MzY0NzQ1MDYxNzk2ZDY1NmU3NA==',
        );
        expect(addLiquidity.data).toEqual('YWRkTGlxdWlkaXR5QDA5QDBhQDA4QDA5');
    });
});
