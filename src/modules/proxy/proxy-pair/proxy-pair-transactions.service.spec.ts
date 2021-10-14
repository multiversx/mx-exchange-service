import { Test, TestingModule } from '@nestjs/testing';
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
import { TransactionsProxyPairService } from './proxy-pair-transactions.service';
import { ContextServiceMock } from '../../../services/context/context.service.mocks';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairServiceMock } from 'src/modules/pair/mocks/pair.service.mock';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair.getter.service.mock';
import { Address } from '@elrondnetwork/erdjs/out';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';

describe('TransactionProxyPairService', () => {
    let service: TransactionsProxyPairService;
    let elrondProxy: ElrondProxyService;

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
                ElrondProxyService,
                ContextServiceProvider,
                PairServiceProvider,
                PairGetterServiceProvider,
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
            'user_address_1',
            {
                pairAddress: Address.Zero().bech32(),
                firstTokenID: 'EGLD',
                firstTokenAmount: firstTokenAmount,
                secondTokenID: 'LKMEX-1234',
                secondTokenNonce: 1,
                secondTokenAmount: secondTokenAmount,
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
            'RVNEVFRyYW5zZmVyQDU3NDU0NzRjNDQyZDMwMzczMzM2MzUzMEAwYUA2MTYzNjM2NTcwNzQ0NTczNjQ3NDUwNjE3OTZkNjU2ZTc0NTA3MjZmNzg3OUAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw',
        );
        expect(transferSecondTokenTransaction.data).toEqual(
            'RVNEVE5GVFRyYW5zZmVyQDRjNGI0ZDQ1NTgyZDMxMzIzMzM0QDAxQDA5QDAwMDAwMDAwMDAwMDAwMDAwNTAwNzRiNzA2MTAwMzZhMTAxMjkxOTRmODQ3NGYyZjYzZTQ5ZTNmMjBjZTdjZWJANjE2MzYzNjU3MDc0NDU3MzY0NzQ1MDYxNzk2ZDY1NmU3NDUwNzI2Zjc4NzlAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMA==',
        );
        expect(addLiquidity.data).toEqual(
            'YWRkTGlxdWlkaXR5UHJveHlAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEA1NzQ1NDc0YzQ0MmQzMDM3MzMzNjM1MzBAQDBhQDA5QDRjNGI0ZDQ1NTgyZDMxMzIzMzM0QDAxQDA5QDA4',
        );
    });

    it('should get add liquidity batch transaction EGLD second token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        jest.spyOn(elrondProxy, 'getAddressShardID').mockImplementation(
            async () => 0,
        );
        const liquidityBatchTransactions = await service.addLiquidityProxyBatch(
            'user_address_1',
            {
                pairAddress: Address.Zero().bech32(),
                firstTokenID: 'LKMEX-1234',
                firstTokenNonce: 1,
                firstTokenAmount: firstTokenAmount,
                secondTokenID: 'EGLD',
                secondTokenAmount: secondTokenAmount,
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
            'RVNEVE5GVFRyYW5zZmVyQDRjNGI0ZDQ1NTgyZDMxMzIzMzM0QDAxQDBhQDAwMDAwMDAwMDAwMDAwMDAwNTAwNzRiNzA2MTAwMzZhMTAxMjkxOTRmODQ3NGYyZjYzZTQ5ZTNmMjBjZTdjZWJANjE2MzYzNjU3MDc0NDU3MzY0NzQ1MDYxNzk2ZDY1NmU3NDUwNzI2Zjc4NzlAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMA==',
        );
        expect(transferSecondTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDU3NDU0NzRjNDQyZDMwMzczMzM2MzUzMEAwOUA2MTYzNjM2NTcwNzQ0NTczNjQ3NDUwNjE3OTZkNjU2ZTc0NTA3MjZmNzg3OUAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw',
        );
        expect(addLiquidity.data).toEqual(
            'YWRkTGlxdWlkaXR5UHJveHlAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEA1NzQ1NDc0YzQ0MmQzMDM3MzMzNjM1MzBAQDA5QDA4QDRjNGI0ZDQ1NTgyZDMxMzIzMzM0QDAxQDBhQDA5',
        );
    });
});
