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
import { ContextServiceMock } from 'src/services/context/mocks/context.service.mock';
import { ContextService } from 'src/services/context/context.service';
import { PairService } from '../services/pair.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { PairGetterService } from '../services/pair.getter.service';
import { PairGetterServiceMock } from '../mocks/pair.getter.service.mock';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigService } from '@nestjs/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { Address } from '@elrondnetwork/erdjs/out';

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

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
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
                ConfigService,
                ApiConfigService,
                ElrondProxyServiceProvider,
                ContextServiceProvider,
                ContextGetterServiceProvider,
                ContextTransactionsService,
                PairService,
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

    it('should get add initial liquidity batch transaction', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const initialLiquidityBatchTransactions = await service.addInitialLiquidityBatch(
            'erd173spamvzs8gv0ln4e4x605t7tucg892xgt2wmgw3pmrt43mwp3ys2lqp9x',
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
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

        const [
            wrapEgldTransaction,
            addLiquidityTransaction,
        ] = initialLiquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(secondTokenAmount);
        expect(
            Buffer.from(addLiquidityTransaction.data, 'base64').toString(),
        ).toEqual(
            'MultiESDTNFTTransfer@0000000000000000000000000000000000000000000000000000000000000000@02@544f4b312d31313131@@09@544f4b322d32323232@@0a@616464496e697469616c4c6971756964697479',
        );
    });

    it('should get add initial liquidity transaction', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const addLiquidityTransaction = await service.addInitialLiquidity(
            'erd173spamvzs8gv0ln4e4x605t7tucg892xgt2wmgw3pmrt43mwp3ys2lqp9x',
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
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

        expect(
            Buffer.from(addLiquidityTransaction.data, 'base64').toString(),
        ).toEqual(
            'MultiESDTNFTTransfer@0000000000000000000000000000000000000000000000000000000000000000@02@544f4b312d31313131@@09@544f4b322d32323232@@0a@616464496e697469616c4c6971756964697479',
        );
    });

    it('should get add liquidity transaction', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const addLiquidityTransaction = await service.addLiquidity(
            'erd173spamvzs8gv0ln4e4x605t7tucg892xgt2wmgw3pmrt43mwp3ys2lqp9x',
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
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

        expect(
            Buffer.from(addLiquidityTransaction.data, 'base64').toString(),
        ).toEqual(
            'MultiESDTNFTTransfer@0000000000000000000000000000000000000000000000000000000000000000@02@544f4b312d31313131@@09@544f4b322d32323232@@0a@6164644c6971756964697479@08@09',
        );
    });

    it('should get add liquidity batch transaction EGLD first token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const liquidityBatchTransactions = await service.addLiquidityBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
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
        expect(Buffer.from(addLiquidity.data, 'base64').toString()).toEqual(
            'MultiESDTNFTTransfer@0000000000000000000000000000000000000000000000000000000000000000@02@544f4b312d31313131@@0a@544f4b322d32323232@@09@6164644c6971756964697479@09@08',
        );
    });

    it('should get add liquidity batch transaction EGLD second token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const liquidityBatchTransactions = await service.addLiquidityBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
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
        expect(Buffer.from(addLiquidity.data, 'base64').toString()).toEqual(
            'MultiESDTNFTTransfer@0000000000000000000000000000000000000000000000000000000000000000@02@544f4b312d31313131@@09@544f4b322d32323232@@0a@6164644c6971756964697479@08@09',
        );
    });

    it('should get remove liquidity transaction', async () => {
        const transactions = await service.removeLiquidity(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                liquidity: '9',
                liquidityTokenID: 'EGLD',
                tolerance: 0.01,
            },
        );

        expect(transactions.length).toEqual(2);
        expect(Buffer.from(transactions[0].data, 'base64').toString()).toEqual(
            'ESDTTransfer@45474c44@09@72656d6f76654c6971756964697479@08@11',
        );
        expect(Buffer.from(transactions[1].data, 'base64').toString()).toEqual(
            'ESDTTransfer@544f4b312d31313131@08@756e7772617045676c64',
        );
    });

    it('should get swap tokens fixed input transaction + wrap tx', async () => {
        const transactions = await service.swapTokensFixedInput(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                tokenInID: 'EGLD',
                tokenOutID: 'TOK2-2222',
                amountIn: '5',
                amountOut: '5',
                tolerance: 0.01,
            },
        );

        expect(transactions.length).toEqual(2);
        expect(Buffer.from(transactions[0].data, 'base64').toString()).toEqual(
            'wrapEgld',
        );
        expect(Buffer.from(transactions[1].data, 'base64').toString()).toEqual(
            'ESDTTransfer@544f4b312d31313131@05@73776170546f6b656e734669786564496e707574@544f4b322d32323232@04',
        );
    });

    it('should get swap tokens fixed output transaction + unwrap tx', async () => {
        const transactions = await service.swapTokensFixedOutput(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                tokenInID: 'TOK2-2222',
                tokenOutID: 'EGLD',
                amountIn: '5',
                amountOut: '5',
            },
        );

        expect(transactions.length).toEqual(2);
        expect(Buffer.from(transactions[0].data, 'base64').toString()).toEqual(
            'ESDTTransfer@544f4b322d32323232@05@73776170546f6b656e7346697865644f7574707574@544f4b312d31313131@05',
        );
        expect(Buffer.from(transactions[1].data, 'base64').toString()).toEqual(
            'ESDTTransfer@544f4b312d31313131@05@756e7772617045676c64',
        );
    });

    it('should validate tokens', async () => {
        const transactions = await service.validateTokens(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            [
                new InputTokenModel({ tokenID: 'TOK2-2222' }),
                new InputTokenModel({ tokenID: 'EGLD' }),
            ],
        );
        expect(transactions[0].tokenID).toEqual('TOK1-1111');
        expect(transactions[1].tokenID).toEqual('TOK2-2222');

        try {
            await service.validateTokens(
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                [
                    new InputTokenModel({ tokenID: 'TOK2-2222', nonce: 1 }),
                    new InputTokenModel({ tokenID: 'EGLD' }),
                ],
            );
        } catch (error) {
            expect(error).toEqual(new Error('Only ESDT tokens allowed!'));
        }

        try {
            await service.validateTokens(
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                [
                    new InputTokenModel({ tokenID: 'TOK1-1111' }),
                    new InputTokenModel({ tokenID: 'EGLD' }),
                ],
            );
        } catch (error) {
            expect(error).toEqual(new Error('invalid tokens received'));
        }
    });

    it('should get add to whitelist transaction', async () => {
        const transaction = await service.whitelist({
            pairAddress:
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            address: Address.Zero().bech32(),
        });
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'whitelist@0000000000000000000000000000000000000000000000000000000000000000',
        );
    });

    it('should get remove from whitelist transaction', async () => {
        const transaction = await service.removeWhitelist({
            pairAddress:
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            address: Address.Zero().bech32(),
        });
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'removeWhitelist@0000000000000000000000000000000000000000000000000000000000000000',
        );
    });

    it('should get add trusted swap pair transaction', async () => {
        const transaction = await service.addTrustedSwapPair(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            'TOK2-2222',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'addTrustedSwapPair@0000000000000000000000000000000000000000000000000000000000000000@544f4b312d31313131@544f4b322d32323232',
        );
    });

    it('should get remove trusted swap pair transaction', async () => {
        const transaction = await service.removeTrustedSwapPair(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            'TOK1-1111',
            'TOK2-2222',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'removeTrustedSwapPair@544f4b312d31313131@544f4b322d32323232',
        );
    });

    it('should get set transfer execution gas limit transaction', async () => {
        const transaction = await service.setTransferExecGasLimit(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '50000000',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'set_transfer_exec_gas_limit@02faf080',
        );
    });

    it('should get set extern swap gas limit transaction', async () => {
        const transaction = await service.setExternSwapGasLimit(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '50000000',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'set_extern_swap_gas_limit@02faf080',
        );
    });

    it('should get pause transaction', async () => {
        const transaction = await service.pause(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'pause',
        );
    });

    it('should get resume transaction', async () => {
        const transaction = await service.resume(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'resume',
        );
    });

    it('should get set state active no swaps transaction', async () => {
        const transaction = await service.setStateActiveNoSwaps(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setStateActiveNoSwaps',
        );
    });

    it('should get set fee percents transaction', async () => {
        const transaction = await service.setFeePercents(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '0.003',
            '0.0005',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setFeePercents@@',
        );
    });

    it('should get set max observations per period transaction', async () => {
        const transaction = await service.setMaxObservationsPerRecord(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1000',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setMaxObservationsPerRecord@03e8',
        );
    });

    it('should get set BP swap config transaction', async () => {
        const transaction = await service.setBPSwapConfig(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            {
                protectStopBlock: '1000',
                volumePercent: '1000000000000000000',
                maxNumActionsPerAddress: '100',
            },
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setBPSwapConfig@03e8@0de0b6b3a7640000@64',
        );
    });

    it('should get set BP remove config transaction', async () => {
        const transaction = await service.setBPRemoveConfig(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            {
                protectStopBlock: '1000',
                volumePercent: '1000000000000000000',
                maxNumActionsPerAddress: '100',
            },
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setBPRemoveConfig@03e8@0de0b6b3a7640000@64',
        );
    });

    it('should get set BP add config transaction', async () => {
        const transaction = await service.setBPAddConfig(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            {
                protectStopBlock: '1000',
                volumePercent: '1000000000000000000',
                maxNumActionsPerAddress: '100',
            },
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setBPAddConfig@03e8@0de0b6b3a7640000@64',
        );
    });

    it('should get set locking deadline epoch transaction', async () => {
        const transaction = await service.setLockingDeadlineEpoch(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1000',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setLockingDeadlineEpoch@03e8',
        );
    });

    it('should get set unlocking epoch transaction', async () => {
        const transaction = await service.setUnlockEpoch(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1005',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setUnlockEpoch@03ed',
        );
    });

    it('should get set locking SC address transaction', async () => {
        const transaction = await service.setLockingScAddress(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setLockingScAddress@0000000000000000000000000000000000000000000000000000000000000000',
        );
    });
});
