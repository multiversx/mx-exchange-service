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
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigService } from '@nestjs/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { Address } from '@elrondnetwork/erdjs/out';
import { encodeTransactionData } from 'src/helpers/helpers';

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
            ],
            providers: [
                ConfigService,
                ApiConfigService,
                ElrondProxyServiceProvider,
                ContextServiceProvider,
                ContextGetterServiceProvider,
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
        expect(addLiquidityTransaction.data).toMatch(
            encodeTransactionData(
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@2@TOK1-1111@@9@TOK2-2222@@10@addInitialLiquidity',
            ),
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
        expect(addLiquidityTransaction.data).toMatch(
            encodeTransactionData(
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@2@TOK1-1111@@9@TOK2-2222@@10@addInitialLiquidity',
            ),
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

        expect(addLiquidityTransaction.data).toMatch(
            encodeTransactionData(
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@2@TOK1-1111@@9@TOK2-2222@@10@addLiquidity@8@9',
            ),
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
        expect(addLiquidity.data).toMatch(
            encodeTransactionData(
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@02@TOK1-1111@@10@TOK2-2222@@09@addLiquidity@09@08',
            ),
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
        expect(addLiquidity.data).toMatch(
            encodeTransactionData(
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@02@TOK1-1111@@09@TOK2-2222@@10@addLiquidity@08@09',
            ),
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
        expect(transactions[0].data).toMatch(
            encodeTransactionData(
                'ESDTTransfer@1162300484@09@removeLiquidity@08@17',
            ),
        );
        expect(transactions[1].data).toMatch(
            encodeTransactionData('ESDTTransfer@TOK1-1111@08@unwrapEgld'),
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
        expect(transactions[0].data).toMatch(
            encodeTransactionData(
                'ESDTTransfer@TOK2-2222@05@swapTokensFixedOutput@TOK1-1111@05',
            ),
        );
        expect(transactions[1].data).toMatch(
            encodeTransactionData('ESDTTransfer@TOK1-1111@05@unwrapEgld'),
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
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'whitelist@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
        );
    });

    it('should get remove from whitelist transaction', async () => {
        const transaction = await service.removeWhitelist({
            pairAddress:
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            address: Address.Zero().bech32(),
        });
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'removeWhitelist@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
        );
    });

    it('should get add trusted swap pair transaction', async () => {
        const transaction = await service.addTrustedSwapPair(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            'TOK2-2222',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'addTrustedSwapPair@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@TOK1-1111@TOK2-2222',
            ),
        );
    });

    it('should get remove trusted swap pair transaction', async () => {
        const transaction = await service.removeTrustedSwapPair(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            'TOK1-1111',
            'TOK2-2222',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData('removeTrustedSwapPair@TOK1-1111@TOK2-2222'),
        );
    });

    it('should get set transfer execution gas limit transaction', async () => {
        const transaction = await service.setTransferExecGasLimit(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '50000000',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData('set_transfer_exec_gas_limit@50000000'),
        );
    });

    it('should get set extern swap gas limit transaction', async () => {
        const transaction = await service.setExternSwapGasLimit(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '50000000',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData('set_extern_swap_gas_limit@50000000'),
        );
    });

    it('should get pause transaction', async () => {
        const transaction = await service.pause(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(transaction.data).toMatch(encodeTransactionData('pause'));
    });

    it('should get resume transaction', async () => {
        const transaction = await service.resume(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(transaction.data).toMatch(encodeTransactionData('resume'));
    });

    it('should get set state active no swaps transaction', async () => {
        const transaction = await service.setStateActiveNoSwaps(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData('setStateActiveNoSwaps'),
        );
    });

    it('should get set fee percents transaction', async () => {
        const transaction = await service.setFeePercents(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '3',
            '5',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData('setFeePercents@03@05'),
        );
    });

    it('should get set max observations per period transaction', async () => {
        const transaction = await service.setMaxObservationsPerRecord(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1000',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData('setMaxObservationsPerRecord@1000'),
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
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'setBPSwapConfig@1000@01000000000000000000@0100',
            ),
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
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'setBPRemoveConfig@1000@01000000000000000000@0100',
            ),
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
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'setBPAddConfig@1000@01000000000000000000@0100',
            ),
        );
    });

    it('should get set locking deadline epoch transaction', async () => {
        const transaction = await service.setLockingDeadlineEpoch(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1000',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData('setLockingDeadlineEpoch@1000'),
        );
    });

    it('should get set unlocking epoch transaction', async () => {
        const transaction = await service.setUnlockEpoch(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1005',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData('setUnlockEpoch@1005'),
        );
    });

    it('should get set locking SC address transaction', async () => {
        const transaction = await service.setLockingScAddress(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'setLockingScAddress@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
        );
    });
});
