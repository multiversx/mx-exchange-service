import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    TypedValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { constantsConfig, elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import {
    AddLiquidityArgs,
    RemoveLiquidityArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
} from '../models/pair.args';
import BigNumber from 'bignumber.js';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { PairGetterService } from './pair.getter.service';
import { PairService } from './pair.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';

@Injectable()
export class PairTransactionService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly contextTransactions: ContextTransactionsService,
        private readonly wrapService: WrapService,
        private readonly wrapTransaction: TransactionsWrapService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async addLiquidityBatch(
        sender: string,
        args: AddLiquidityArgs,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];

        switch (elrondConfig.EGLDIdentifier) {
            case args.tokens[0].tokenID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        args.tokens[0].amount,
                    ),
                );
                break;
            case args.tokens[1].tokenID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        args.tokens[1].amount,
                    ),
                );
                break;
            default:
                break;
        }

        transactions.push(await this.addLiquidity(sender, args));

        return transactions;
    }

    async addLiquidity(
        sender: string,
        args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        let firstTokenInput, secondTokenInput: InputTokenModel;
        try {
            [firstTokenInput, secondTokenInput] = await this.validateTokens(
                args.pairAddress,
                args.tokens,
            );
        } catch (error) {
            const logMessage = generateLogMessage(
                PairTransactionService.name,
                this.addLiquidity.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const amount0 = new BigNumber(firstTokenInput.amount);
        const amount1 = new BigNumber(secondTokenInput.amount);

        const amount0Min = amount0
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = amount1
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );

        const endpointArgs: TypedValue[] = [
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            [firstTokenInput, secondTokenInput],
            'addLiquidity',
            endpointArgs,
            new GasLimit(gasConfig.pairs.addLiquidity),
        );
    }

    async removeLiquidity(
        sender: string,
        args: RemoveLiquidityArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const [
            wrappedTokenID,
            firstTokenID,
            secondTokenID,
            liquidityPosition,
            contract,
        ] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.pairGetterService.getFirstTokenID(args.pairAddress),
            this.pairGetterService.getSecondTokenID(args.pairAddress),
            this.pairService.getLiquidityPosition(
                args.pairAddress,
                args.liquidity,
            ),
            this.elrondProxy.getPairSmartContract(args.pairAddress),
        ]);

        const amount0Min = new BigNumber(liquidityPosition.firstTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = new BigNumber(liquidityPosition.secondTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const transactionArgs = [
            BytesValue.fromUTF8(args.liquidityTokenID),
            new BigUIntValue(new BigNumber(args.liquidity)),
            BytesValue.fromUTF8('removeLiquidity'),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];
        transactions.push(
            this.contextTransactions.esdtTransfer(
                contract,
                transactionArgs,
                new GasLimit(gasConfig.pairs.removeLiquidity),
            ),
        );

        switch (wrappedTokenID) {
            case firstTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amount0Min.toString(),
                    ),
                );
                break;
            case secondTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amount1Min.toString(),
                    ),
                );
        }

        return transactions;
    }

    async swapTokensFixedInput(
        sender: string,
        args: SwapTokensFixedInputArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        let transactionArgs: TypedValue[];
        const [wrappedTokenID, contract, trustedSwapPairs] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.elrondProxy.getPairSmartContract(args.pairAddress),
            this.pairGetterService.getTrustedSwapPairs(args.pairAddress),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);
        const amountOutMin = new BigNumber(1)
            .dividedBy(new BigNumber(1).plus(args.tolerance))
            .multipliedBy(amountOut)
            .integerValue();

        switch (elrondConfig.EGLDIdentifier) {
            case args.tokenInID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(sender, args.amountIn),
                );

                transactionArgs = [
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOutMin),
                ];

                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedInput.default
                                : gasConfig.pairs.swapTokensFixedInput
                                      .withFeeSwap,
                        ),
                    ),
                );
                break;
            case args.tokenOutID:
                transactionArgs = [
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountOutMin),
                ];
                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedInput.default
                                : gasConfig.pairs.swapTokensFixedInput
                                      .withFeeSwap,
                        ),
                    ),
                );
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amountOutMin.toString(),
                    ),
                );
                break;
            default:
                transactionArgs = [
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOutMin),
                ];

                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedInput.default
                                : gasConfig.pairs.swapTokensFixedInput
                                      .withFeeSwap,
                        ),
                    ),
                );
                break;
        }

        return transactions;
    }

    async swapTokensFixedOutput(
        sender: string,
        args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];
        let transactionArgs: TypedValue[];
        const [wrappedTokenID, contract, trustedSwapPairs] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.elrondProxy.getPairSmartContract(args.pairAddress),
            this.pairGetterService.getTrustedSwapPairs(args.pairAddress),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);

        switch (elrondConfig.EGLDIdentifier) {
            case args.tokenInID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        amountIn.toString(),
                    ),
                );

                transactionArgs = [
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOut),
                ];

                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedOutput.default
                                : gasConfig.pairs.swapTokensFixedOutput
                                      .withFeeSwap,
                        ),
                    ),
                );
                break;
            case args.tokenOutID:
                transactionArgs = [
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountOut),
                ];
                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedOutput.default
                                : gasConfig.pairs.swapTokensFixedOutput
                                      .withFeeSwap,
                        ),
                    ),
                );
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        args.amountOut,
                    ),
                );
                break;
            default:
                transactionArgs = [
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOut),
                ];

                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedOutput.default
                                : gasConfig.pairs.swapTokensFixedOutput
                                      .withFeeSwap,
                        ),
                    ),
                );
                break;
        }
        return transactions;
    }

    async validateTokens(
        pairAddress: string,
        tokens: InputTokenModel[],
    ): Promise<InputTokenModel[]> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);

        if (tokens[0].nonce > 0 || tokens[1].nonce > 0) {
            throw new Error('Only ESDT tokens allowed!');
        }

        if (
            tokens[0].tokenID === elrondConfig.EGLDIdentifier ||
            tokens[1].tokenID === elrondConfig.EGLDIdentifier
        ) {
            return await this.getTokensWithEGLD(
                tokens,
                firstTokenID,
                secondTokenID,
            );
        }

        if (
            tokens[0].tokenID === firstTokenID &&
            tokens[1].tokenID === secondTokenID
        ) {
            return tokens;
        }

        if (
            tokens[1].tokenID === firstTokenID &&
            tokens[0].tokenID === secondTokenID
        ) {
            return [tokens[1], tokens[0]];
        }

        throw new Error('invalid tokens received');
    }

    private async getTokensWithEGLD(
        tokens: InputTokenModel[],
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<InputTokenModel[]> {
        switch (elrondConfig.EGLDIdentifier) {
            case tokens[0].tokenID:
                return await this.getTokensInOrder(
                    tokens[1],
                    tokens[0],
                    firstTokenID,
                    secondTokenID,
                );
            case tokens[1].tokenID:
                return await this.getTokensInOrder(
                    tokens[0],
                    tokens[1],
                    firstTokenID,
                    secondTokenID,
                );
            default:
                throw new Error('Invalid tokens with EGLD');
        }
    }

    private async getTokensInOrder(
        firstToken: InputTokenModel,
        secondToken: InputTokenModel,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<InputTokenModel[]> {
        const wrappedTokenID = await this.wrapService.getWrappedEgldTokenID();
        if (firstToken.tokenID === firstTokenID) {
            return [
                firstToken,
                new InputTokenModel({
                    tokenID: wrappedTokenID,
                    amount: secondToken.amount,
                    nonce: secondToken.nonce,
                }),
            ];
        }
        if (firstToken.tokenID === secondTokenID) {
            return [
                new InputTokenModel({
                    tokenID: wrappedTokenID,
                    amount: secondToken.amount,
                    nonce: secondToken.nonce,
                }),
                firstToken,
            ];
        }
    }
}
