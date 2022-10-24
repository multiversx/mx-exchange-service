import { Test, TestingModule } from '@nestjs/testing';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { PairTransactionService } from '../services/pair.transactions.service';
import { PairService } from '../services/pair.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { PairGetterService } from '../services/pair.getter.service';
import { PairGetterServiceStub } from '../mocks/pair-getter-service-stub.service';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigService } from '@nestjs/config';
import { Address } from '@elrondnetwork/erdjs/out';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { CachingModule } from 'src/services/caching/cache.module';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';

describe('TransactionPairService', () => {
    let service: PairTransactionService;

    const ElrondProxyServiceProvider = {
        provide: ElrondProxyService,
        useClass: ElrondProxyServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
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
                CachingModule,
            ],
            providers: [
                ConfigService,
                ApiConfigService,
                ElrondProxyServiceProvider,
                PairService,
                PairGetterServiceProvider,
                RouterGetterServiceProvider,
                WrapServiceProvider,
                TransactionsWrapService,
                TokenGetterServiceProvider,
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
        const pairAddress =
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u';
        const liquidityBatchTransactions = await service.addLiquidityBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress,
                tokens: [
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'TOK2-2222',
                        nonce: 0,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );

        const [wrapEgldTransaction, addLiquidity] = liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(firstTokenAmount);
        expect(addLiquidity.data).toEqual(
            Buffer.from(
                `MultiESDTNFTTransfer@${Address.fromString(
                    pairAddress,
                ).hex()}@02@544f4b312d31313131@@0a@544f4b322d32323232@@09@6164644c6971756964697479@09@08`,
            ).toString('base64'),
        );
    });

    it('should get add liquidity batch transaction EGLD second token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        const pairAddress =
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u';
        const liquidityBatchTransactions = await service.addLiquidityBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress,
                tokens: [
                    {
                        tokenID: 'TOK2-2222',
                        nonce: 0,
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

        const [wrapEgldTransaction, addLiquidity] = liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(secondTokenAmount);
        expect(addLiquidity.data).toEqual(
            Buffer.from(
                `MultiESDTNFTTransfer@${Address.fromString(
                    pairAddress,
                ).hex()}@02@544f4b312d31313131@@09@544f4b322d32323232@@0a@6164644c6971756964697479@08@09`,
            ).toString('base64'),
        );
    });
});
