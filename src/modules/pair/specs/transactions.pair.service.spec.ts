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
        expect(addLiquidityTransaction.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwMkA1NDRmNGIzMTJkMzEzMTMxMzFAQDA5QDU0NGY0YjMyMmQzMjMyMzIzMkBAMGFANjE2NDY0NDk2ZTY5NzQ2OTYxNmM0YzY5NzE3NTY5NjQ2OTc0Nzk=',
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

        expect(addLiquidityTransaction.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwMkA1NDRmNGIzMTJkMzEzMTMxMzFAQDA5QDU0NGY0YjMyMmQzMjMyMzIzMkBAMGFANjE2NDY0NDk2ZTY5NzQ2OTYxNmM0YzY5NzE3NTY5NjQ2OTc0Nzk=',
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

        expect(addLiquidityTransaction.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwMkA1NDRmNGIzMTJkMzEzMTMxMzFAQDA5QDU0NGY0YjMyMmQzMjMyMzIzMkBAMGFANjE2NDY0NGM2OTcxNzU2OTY0Njk3NDc5QDA4QDA5',
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
        expect(addLiquidity.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwMkA1NDRmNGIzMTJkMzEzMTMxMzFAQDBhQDU0NGY0YjMyMmQzMjMyMzIzMkBAMDlANjE2NDY0NGM2OTcxNzU2OTY0Njk3NDc5QDA5QDA4',
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
        expect(addLiquidity.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwMkA1NDRmNGIzMTJkMzEzMTMxMzFAQDA5QDU0NGY0YjMyMmQzMjMyMzIzMkBAMGFANjE2NDY0NGM2OTcxNzU2OTY0Njk3NDc5QDA4QDA5',
        );
    });

    it('should get remove liquidity transaction', async () => {
        const removeLiquidityTransactions = await service.removeLiquidity(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                liquidity: '9',
                liquidityTokenID: 'EGLD',
                tolerance: 0.01,
            },
        );

        expect(removeLiquidityTransactions.length).toEqual(2);
        expect(removeLiquidityTransactions[0].data).toEqual(
            'RVNEVFRyYW5zZmVyQDQ1NDc0YzQ0QDA5QDcyNjU2ZDZmNzY2NTRjNjk3MTc1Njk2NDY5NzQ3OUAwOEAxMQ==',
        );
        expect(removeLiquidityTransactions[1].data).toEqual(
            'RVNEVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUAwOEA3NTZlNzc3MjYxNzA0NTY3NmM2NA==',
        );
    });

    it('should get remove liquidity and buy back and burn token transaction', async () => {
        const removeLiquidityAndBuyBackAndBurnTokenTransaction = await service.removeLiquidityAndBuyBackAndBurnToken(
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                tokenToBuyBackAndBurnID: 'TOK2-2222',
                tokenInID: 'EGLD',
                amount: '5',
            },
        );

        expect(removeLiquidityAndBuyBackAndBurnTokenTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDQ1NDc0YzQ0QDA1QDcyNjU2ZDZmNzY2NTRjNjk3MTc1Njk2NDY5NzQ3OTQxNmU2NDQyNzU3OTQyNjE2MzZiNDE2ZTY0NDI3NTcyNmU1NDZmNmI2NTZlQDU0NGY0YjMyMmQzMjMyMzIzMg==',
        );
    });

    it('should get swap tokens fixed input transaction + wrap tx', async () => {
        const swapTokensFixedInputTransactions = await service.swapTokensFixedInput(
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

        expect(swapTokensFixedInputTransactions.length).toEqual(2);
        expect(swapTokensFixedInputTransactions[0].data).toEqual(
            'd3JhcEVnbGQ=',
        );
        expect(swapTokensFixedInputTransactions[1].data).toEqual(
            'RVNEVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUAwNUA3Mzc3NjE3MDU0NmY2YjY1NmU3MzQ2Njk3ODY1NjQ0OTZlNzA3NTc0QDU0NGY0YjMyMmQzMjMyMzIzMkAwNA==',
        );
    });

    it('should get swap tokens fixed output transaction + unwrap tx', async () => {
        const swapTokensFixedOutputTransactions = await service.swapTokensFixedOutput(
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

        expect(swapTokensFixedOutputTransactions.length).toEqual(2);
        expect(swapTokensFixedOutputTransactions[0].data).toEqual(
            'RVNEVFRyYW5zZmVyQDU0NGY0YjMyMmQzMjMyMzIzMkAwNUA3Mzc3NjE3MDU0NmY2YjY1NmU3MzQ2Njk3ODY1NjQ0Zjc1NzQ3MDc1NzRANTQ0ZjRiMzEyZDMxMzEzMTMxQDA1',
        );
        expect(swapTokensFixedOutputTransactions[1].data).toEqual(
            'RVNEVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUAwNUA3NTZlNzc3MjYxNzA0NTY3NmM2NA==',
        );
    });

    it('should validate tokens', async () => {
        const validateInputTokensResponse_0 = await service.validateTokens(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            [
                new InputTokenModel({ tokenID: 'TOK2-2222' }),
                new InputTokenModel({ tokenID: 'EGLD' }),
            ],
        );
        expect(validateInputTokensResponse_0[0].tokenID).toEqual('TOK1-1111');
        expect(validateInputTokensResponse_0[1].tokenID).toEqual('TOK2-2222');

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

    it('should get swap with no fee and forward transaction', async () => {
        const swapNoFeeAndForwardTransaction = await service.swapNoFeeAndForward(
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                tokenOutID: 'EGLD',
                destination: Address.Zero().bech32(),
            },
        );
        expect(swapNoFeeAndForwardTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDQ1NDc0YzQ0QEA3Mzc3NjE3MDRlNmY0NjY1NjU0MTZlNjQ0NjZmNzI3NzYxNzI2NA==',
        );
    });

    it('should get set LP token identifier transaction', async () => {
        const setLpTokenIdentifierTransaction = await service.setLpTokenIdentifier(
            {
                pairAddress:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                tokenID: 'LPT-1234',
            },
        );
        expect(setLpTokenIdentifierTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDRjNzA1NDZmNmI2NTZlNDk2NDY1NmU3NDY5NjY2OTY1NzJANGM1MDU0MmQzMTMyMzMzNA==',
        );
    });

    it('should get add to whitelist transaction', async () => {
        const addToWhitelistTransaction = await service.whitelist({
            pairAddress:
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            address: Address.Zero().bech32(),
        });
        expect(addToWhitelistTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDc3Njg2OTc0NjU2YzY5NzM3NEAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw',
        );
    });

    it('should get remove from whitelist transaction', async () => {
        const removeFromWhitelistTransaction = await service.removeWhitelist({
            pairAddress:
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            address: Address.Zero().bech32(),
        });
        expect(removeFromWhitelistTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDcyNjU2ZDZmNzY2NTU3Njg2OTc0NjU2YzY5NzM3NEAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw',
        );
    });

    it('should get add trusted swap pair transaction', async () => {
        const addTrustedSwapPairTransaction = await service.addTrustedSwapPair(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            'TOK2-2222',
        );
        expect(addTrustedSwapPairTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDYxNjQ2NDU0NzI3NTczNzQ2NTY0NTM3NzYxNzA1MDYxNjk3MkAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwQDU0NGY0YjMxMmQzMTMxMzEzMUA1NDRmNGIzMjJkMzIzMjMyMzI=',
        );
    });

    it('should get remove trusted swap pair transaction', async () => {
        const removeTrustedSwapPairTransaction = await service.removeTrustedSwapPair(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            'TOK1-1111',
            'TOK2-2222',
        );
        expect(removeTrustedSwapPairTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDYxNjQ2NDU0NzI3NTczNzQ2NTY0NTM3NzYxNzA1MDYxNjk3MkA1NDRmNGIzMTJkMzEzMTMxMzFANTQ0ZjRiMzIyZDMyMzIzMjMy',
        );
    });

    it('should get set transfer execution gas limit transaction', async () => {
        const setTransferExecGasLimitTransaction = await service.setTransferExecGasLimit(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '50000000',
        );
        expect(setTransferExecGasLimitTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDVmNzQ3MjYxNmU3MzY2NjU3MjVmNjU3ODY1NjM1ZjY3NjE3MzVmNmM2OTZkNjk3NEAwMmZhZjA4MA==',
        );
    });

    it('should get set transfer execution gas limit transaction', async () => {
        const setExternExecGasLimitTransaction = await service.setExternExecGasLimit(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '50000000',
        );
        expect(setExternExecGasLimitTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDVmNjU3ODc0NjU3MjZlNWY3Mzc3NjE3MDVmNjc2MTczNWY2YzY5NmQ2OTc0QDAyZmFmMDgw',
        );
    });

    it('should get pause transaction', async () => {
        const pauseTransaction = await service.pause(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(pauseTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDcwNjE3NTczNjU=',
        );
    });

    it('should get resume transaction', async () => {
        const resumeTransaction = await service.pause(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(resumeTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDcwNjE3NTczNjU=',
        );
    });

    it('should get set state active no swaps transaction', async () => {
        const setStateActiveNoSwapsTransaction = await service.setStateActiveNoSwaps(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(setStateActiveNoSwapsTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDUzNzQ2MTc0NjU0MTYzNzQ2OTc2NjU0ZTZmNTM3NzYxNzA3Mw==',
        );
    });

    it('should get set fee percents transaction', async () => {
        const setFeePercentsTransaction = await service.setFeePercents(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '0.003',
            '0.0005',
        );
        expect(setFeePercentsTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDQ2NjU2NTUwNjU3MjYzNjU2ZTc0NzNAQA==',
        );
    });

    it('should get update and get tokens for given position with save price transaction', async () => {
        const updateAndGetTokensForGivenPositionWithSafePriceTransaction = await service.updateAndGetTokensForGivenPositionWithSafePrice(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1000000000000000000',
        );
        expect(
            updateAndGetTokensForGivenPositionWithSafePriceTransaction.data,
        ).toEqual(
            'RVNEVFRyYW5zZmVyQDc1NzA2NDYxNzQ2NTQxNmU2NDQ3NjU3NDU0NmY2YjY1NmU3MzQ2NmY3MjQ3Njk3NjY1NmU1MDZmNzM2OTc0Njk2ZjZlNTc2OTc0Njg1MzYxNjY2NTUwNzI2OTYzNjVAMGRlMGI2YjNhNzY0MDAwMA==',
        );
    });

    it('should get set max observations per period transaction', async () => {
        const setMaxObservationsPerRecordTransaction = await service.setMaxObservationsPerRecord(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1000',
        );
        expect(setMaxObservationsPerRecordTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDRkNjE3ODRmNjI3MzY1NzI3NjYxNzQ2OTZmNmU3MzUwNjU3MjUyNjU2MzZmNzI2NEAwM2U4',
        );
    });

    it('should get set BP swap config transaction', async () => {
        const setBPSwapConfigTransaction = await service.setBPSwapConfig(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            {
                protectStopBlock: '1000',
                volumePercent: '1000000000000000000',
                maxNumActionsPerAddress: '100',
            },
        );
        expect(setBPSwapConfigTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDQyNTA1Mzc3NjE3MDQzNmY2ZTY2Njk2N0AwM2U4QDBkZTBiNmIzYTc2NDAwMDBANjQ=',
        );
    });

    it('should get set BP remove config transaction', async () => {
        const setBPRemoveConfigTransaction = await service.setBPRemoveConfig(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            {
                protectStopBlock: '1000',
                volumePercent: '1000000000000000000',
                maxNumActionsPerAddress: '100',
            },
        );
        expect(setBPRemoveConfigTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDQyNTA1MjY1NmQ2Zjc2NjU0MzZmNmU2NjY5NjdAMDNlOEAwZGUwYjZiM2E3NjQwMDAwQDY0',
        );
    });

    it('should get set BP add config transaction', async () => {
        const setBPAddConfigTransaction = await service.setBPAddConfig(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            {
                protectStopBlock: '1000',
                volumePercent: '1000000000000000000',
                maxNumActionsPerAddress: '100',
            },
        );
        expect(setBPAddConfigTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDQyNTA0MTY0NjQ0MzZmNmU2NjY5NjdAMDNlOEAwZGUwYjZiM2E3NjQwMDAwQDY0',
        );
    });

    it('should get set locking deadline epoch transaction', async () => {
        const setLockingDeadlineEpochTransaction = await service.setLockingDeadlineEpoch(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1000',
        );
        expect(setLockingDeadlineEpochTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDRjNmY2MzZiNjk2ZTY3NDQ2NTYxNjQ2YzY5NmU2NTQ1NzA2ZjYzNjhAMDNlOA==',
        );
    });

    it('should get set unlocking epoch transaction', async () => {
        const setUnlockEpochTransaction = await service.setUnlockEpoch(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1005',
        );
        expect(setUnlockEpochTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDU1NmU2YzZmNjM2YjQ1NzA2ZjYzNjhAMDNlZA==',
        );
    });

    it('should get set locking SC address transaction', async () => {
        const setLockingScAddressTransaction = await service.setLockingScAddress(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
        );
        expect(setLockingScAddressTransaction.data).toEqual(
            'RVNEVFRyYW5zZmVyQDczNjU3NDRjNmY2MzZiNjk2ZTY3NTM2MzQxNjQ2NDcyNjU3MzczQDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=',
        );
    });
});
