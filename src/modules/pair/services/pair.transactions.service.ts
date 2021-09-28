import { Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    TypedValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { GasLimit } from '@elrondnetwork/erdjs';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import {
    AddLiquidityArgs,
    AddLiquidityBatchArgs,
    ESDTTransferArgs,
    ReclaimTemporaryFundsArgs,
    RemoveLiquidityArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
} from '../models/pair.args';
import { PairService } from './pair.service';
import BigNumber from 'bignumber.js';
import { ContextService } from 'src/services/context/context.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';

@Injectable()
export class TransactionPairService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly pairService: PairService,
        private readonly context: ContextService,
        private readonly wrapService: WrapService,
        private readonly wrapTransaction: TransactionsWrapService,
    ) {}

    async addLiquidityBatch(
        args: AddLiquidityBatchArgs,
    ): Promise<TransactionModel[]> {
        let eGLDwrapTransaction: Promise<TransactionModel>;
        const transactions: Promise<TransactionModel>[] = [];

        const wrappedTokenID = await this.wrapService.getWrappedEgldTokenID();

        let firstTokenID = args.firstTokenID;
        let secondTokenID = args.secondTokenID;
        let firstTokenAmount = args.firstTokenAmount;
        let secondTokenAmount = args.secondTokenAmount;

        switch (elrondConfig.EGLDIdentifier) {
            case args.firstTokenID:
                firstTokenID = wrappedTokenID;
                eGLDwrapTransaction = this.wrapTransaction.wrapEgld(
                    args.sender,
                    firstTokenAmount,
                );
                transactions.push(eGLDwrapTransaction);

                break;
            case args.secondTokenID:
                firstTokenID = wrappedTokenID;
                firstTokenAmount = args.secondTokenAmount;
                secondTokenID = args.firstTokenID;
                secondTokenAmount = args.firstTokenAmount;

                eGLDwrapTransaction = this.wrapTransaction.wrapEgld(
                    args.sender,
                    firstTokenAmount,
                );
                transactions.push(eGLDwrapTransaction);
                break;
            default:
                break;
        }

        const esdtTransferTransactions = this.esdtTransferBatch([
            {
                pairAddress: args.pairAddress,
                token: firstTokenID,
                amount: firstTokenAmount,
            },
            {
                pairAddress: args.pairAddress,
                token: secondTokenID,
                amount: secondTokenAmount,
            },
        ]);

        esdtTransferTransactions.map(transaction =>
            transactions.push(transaction),
        );

        const addLiquidityTransaction = this.addLiquidity({
            pairAddress: args.pairAddress,
            amount0: firstTokenAmount,
            amount1: secondTokenAmount,
            tolerance: args.tolerance,
        });
        transactions.push(addLiquidityTransaction);

        return Promise.all(transactions);
    }

    async addLiquidity(args: AddLiquidityArgs): Promise<TransactionModel> {
        const amount0 = new BigNumber(args.amount0);
        const amount1 = new BigNumber(args.amount1);

        const amount0Min = amount0
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = amount1
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );
        const interaction: Interaction = contract.methods.addLiquidity([
            new BigUIntValue(amount0),
            new BigUIntValue(amount1),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ]);

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.addLiquidity));

        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async reclaimTemporaryFunds(
        args: ReclaimTemporaryFundsArgs,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];
        const wrappedTokenID = await this.wrapService.getWrappedEgldTokenID();
        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );
        const interaction: Interaction = contract.methods.reclaimTemporaryFunds(
            [],
        );
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.reclaimTemporaryFunds));
        transactions.push(TransactionModel.fromTransaction(transaction));

        switch (wrappedTokenID) {
            case args.firstTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        args.sender,
                        args.firstTokenAmount,
                    ),
                );
                break;
            case args.secondTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        args.sender,
                        args.secoundTokenAmount,
                    ),
                );
                break;
        }

        return transactions;
    }

    async removeLiquidity(
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
            this.pairService.getFirstTokenID(args.pairAddress),
            this.pairService.getSecondTokenID(args.pairAddress),
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
            this.context.esdtTransfer(
                contract,
                transactionArgs,
                new GasLimit(gasConfig.removeLiquidity),
            ),
        );

        switch (wrappedTokenID) {
            case firstTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        args.sender,
                        amount0Min.toString(),
                    ),
                );
                break;
            case secondTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        args.sender,
                        amount1Min.toString(),
                    ),
                );
        }

        return transactions;
    }

    async swapTokensFixedInput(
        args: SwapTokensFixedInputArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        let transactionArgs: TypedValue[];
        const [wrappedTokenID, contract] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.elrondProxy.getPairSmartContract(args.pairAddress),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);
        const amountOutMin = amountOut
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        switch (elrondConfig.EGLDIdentifier) {
            case args.tokenInID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        args.sender,
                        args.amountIn,
                    ),
                );

                transactionArgs = [
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOutMin),
                ];

                transactions.push(
                    this.context.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(gasConfig.swapTokens),
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
                    this.context.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(gasConfig.swapTokens),
                    ),
                );
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        args.sender,
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
                    this.context.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(gasConfig.swapTokens),
                    ),
                );
                break;
        }

        return transactions;
    }

    async swapTokensFixedOutput(
        args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        let transactionArgs: TypedValue[];
        const [wrappedTokenID, contract] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.elrondProxy.getPairSmartContract(args.pairAddress),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);
        const amountInMax = amountIn
            .multipliedBy(1 + args.tolerance)
            .integerValue();

        switch (elrondConfig.EGLDIdentifier) {
            case args.tokenInID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        args.sender,
                        amountInMax.toString(),
                    ),
                );

                transactionArgs = [
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountInMax),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOut),
                ];

                transactions.push(
                    this.context.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(gasConfig.swapTokens),
                    ),
                );
                break;
            case args.tokenOutID:
                transactionArgs = [
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountInMax),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountOut),
                ];
                transactions.push(
                    this.context.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(gasConfig.swapTokens),
                    ),
                );
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        args.sender,
                        args.amountOut,
                    ),
                );
                break;
            default:
                transactionArgs = [
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountInMax),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOut),
                ];

                transactions.push(
                    this.context.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(gasConfig.swapTokens),
                    ),
                );
                break;
        }

        return transactions;
    }

    esdtTransferBatch(
        batchArgs: ESDTTransferArgs[],
    ): Promise<TransactionModel>[] {
        return batchArgs.map(args =>
            this.esdtTransfer({
                pairAddress: args.pairAddress,
                token: args.token,
                amount: args.amount,
            }),
        );
    }

    async esdtTransfer(args: ESDTTransferArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8(args.token),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromUTF8('acceptEsdtPayment'),
        ];

        return this.context.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );
    }
}
