import { Injectable } from '@nestjs/common';
import { elrondConfig, gasConfig } from '../../../config';
import {
    BigUIntValue,
    BytesValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { TransactionModel } from '../../../models/transaction.model';
import BigNumber from 'bignumber.js';
import { PairService } from 'src/modules/pair/services/pair.service';
import {
    AddLiquidityProxyArgs,
    AddLiquidityProxyBatchArgs,
    ReclaimTemporaryFundsProxyArgs,
    RemoveLiquidityProxyArgs,
    TokensTransferArgs,
} from '../models/proxy-pair.args';
import { ContextService } from '../../../services/context/context.service';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { WrapService } from '../../wrapping/wrap.service';
import { TransactionsWrapService } from '../../wrapping/transactions-wrap.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';

@Injectable()
export class TransactionsProxyPairService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly context: ContextService,
        private readonly wrapService: WrapService,
        private readonly wrapTransaction: TransactionsWrapService,
    ) {}

    async addLiquidityProxyBatch(
        args: AddLiquidityProxyBatchArgs,
        mergeTokens = false,
    ): Promise<TransactionModel[]> {
        let eGLDwrapTransaction: Promise<TransactionModel>;
        let esdtTransferTransactions: Promise<TransactionModel>[];
        let addLiquidityProxyTransaction: Promise<TransactionModel>;
        const transactions: Promise<TransactionModel>[] = [];

        const wrappedTokenID = await this.wrapService.getWrappedEgldTokenID();

        switch (elrondConfig.EGLDIdentifier) {
            case args.firstTokenID:
                eGLDwrapTransaction = this.wrapTransaction.wrapEgld(
                    args.sender,
                    args.firstTokenAmount,
                );
                transactions.push(eGLDwrapTransaction);

                esdtTransferTransactions = this.esdtTransferProxyBatch([
                    {
                        pairAddress: args.pairAddress,
                        amount: args.firstTokenAmount,
                        tokenID: wrappedTokenID,
                        sender: args.sender,
                    },
                    {
                        pairAddress: args.pairAddress,
                        amount: args.secondTokenAmount,
                        tokenID: args.secondTokenID,
                        tokenNonce: args.secondTokenNonce,
                        sender: args.sender,
                    },
                ]);

                esdtTransferTransactions.map(transaction =>
                    transactions.push(transaction),
                );

                addLiquidityProxyTransaction = this.addLiquidityProxy(
                    {
                        pairAddress: args.pairAddress,
                        amount0: args.firstTokenAmount,
                        amount1: args.secondTokenAmount,
                        token0ID: wrappedTokenID,
                        token0Nonce: args.firstTokenNonce,
                        token1ID: args.secondTokenID,
                        token1Nonce: args.secondTokenNonce,
                        tolerance: args.tolerance,
                    },
                    mergeTokens,
                );
                transactions.push(addLiquidityProxyTransaction);

                break;
            case args.secondTokenID:
                eGLDwrapTransaction = this.wrapTransaction.wrapEgld(
                    args.sender,
                    args.secondTokenAmount,
                );
                transactions.push(eGLDwrapTransaction);

                esdtTransferTransactions = this.esdtTransferProxyBatch([
                    {
                        pairAddress: args.pairAddress,
                        amount: args.firstTokenAmount,
                        tokenID: args.firstTokenID,
                        tokenNonce: args.firstTokenNonce,
                        sender: args.sender,
                    },
                    {
                        pairAddress: args.pairAddress,
                        amount: args.secondTokenAmount,
                        tokenID: wrappedTokenID,
                        sender: args.sender,
                    },
                ]);

                esdtTransferTransactions.map(transaction =>
                    transactions.push(transaction),
                );

                addLiquidityProxyTransaction = this.addLiquidityProxy(
                    {
                        pairAddress: args.pairAddress,
                        amount0: args.secondTokenAmount,
                        amount1: args.firstTokenAmount,
                        token0ID: wrappedTokenID,
                        token0Nonce: args.secondTokenNonce,
                        token1ID: args.firstTokenID,
                        token1Nonce: args.firstTokenNonce,
                        tolerance: args.tolerance,
                    },
                    mergeTokens,
                );
                transactions.push(addLiquidityProxyTransaction);
                break;
            default:
                esdtTransferTransactions = this.esdtTransferProxyBatch([
                    {
                        pairAddress: args.pairAddress,
                        amount: args.firstTokenAmount,
                        tokenID: args.firstTokenID,
                        tokenNonce: args.firstTokenNonce,
                        sender: args.sender,
                    },
                    {
                        pairAddress: args.pairAddress,
                        amount: args.secondTokenAmount,
                        tokenID: args.secondTokenID,
                        tokenNonce: args.secondTokenNonce,
                        sender: args.sender,
                    },
                ]);

                esdtTransferTransactions.map(transaction =>
                    transactions.push(transaction),
                );
                if (!args.firstTokenNonce && args.secondTokenNonce) {
                    addLiquidityProxyTransaction = this.addLiquidityProxy(
                        {
                            pairAddress: args.pairAddress,
                            amount0: args.firstTokenAmount,
                            amount1: args.secondTokenAmount,
                            token0ID: args.firstTokenID,
                            token0Nonce: args.firstTokenNonce,
                            token1ID: args.secondTokenID,
                            token1Nonce: args.secondTokenNonce,
                            tolerance: args.tolerance,
                        },
                        mergeTokens,
                    );
                    transactions.push(addLiquidityProxyTransaction);
                } else if (args.firstTokenNonce && !args.secondTokenNonce) {
                    addLiquidityProxyTransaction = this.addLiquidityProxy(
                        {
                            pairAddress: args.pairAddress,
                            amount0: args.secondTokenAmount,
                            amount1: args.firstTokenAmount,
                            token0ID: args.secondTokenID,
                            token0Nonce: args.secondTokenNonce,
                            token1ID: args.firstTokenID,
                            token1Nonce: args.firstTokenNonce,
                            tolerance: args.tolerance,
                        },
                        mergeTokens,
                    );
                    transactions.push(addLiquidityProxyTransaction);
                }
                break;
        }

        return Promise.all(transactions);
    }

    async addLiquidityProxy(
        args: AddLiquidityProxyArgs,
        mergeTokens = false,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const amount0 = new BigNumber(args.amount0);
        const amount1 = new BigNumber(args.amount1);

        const amount0Min = amount0
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = amount1
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const interaction: Interaction = contract.methods.addLiquidityProxy([
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            BytesValue.fromUTF8(args.token0ID),
            new U32Value(args.token0Nonce ? args.token0Nonce : 0),
            new BigUIntValue(amount0),
            new BigUIntValue(amount0Min),
            BytesValue.fromUTF8(args.token1ID),
            new U32Value(args.token1Nonce ? args.token1Nonce : 0),
            new BigUIntValue(amount1),
            new BigUIntValue(amount1Min),
        ]);

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(
            new GasLimit(
                mergeTokens
                    ? gasConfig.addLiquidityProxyMerge
                    : gasConfig.addLiquidityProxy,
            ),
        );

        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async removeLiquidityProxy(
        args: RemoveLiquidityProxyArgs,
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
            this.elrondProxy.getProxyDexSmartContract(),
        ]);
        const amount0Min = new BigNumber(
            liquidityPosition.firstTokenAmount.toString(),
        ).multipliedBy(1 - args.tolerance);
        const amount1Min = new BigNumber(
            liquidityPosition.secondTokenAmount.toString(),
        ).multipliedBy(1 - args.tolerance);

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedLpTokenID),
            new U32Value(args.wrappedLpTokenNonce),
            new BigUIntValue(new BigNumber(args.liquidity)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('removeLiquidityProxy'),
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        const transaction = this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.removeLiquidityProxy),
        );
        transaction.receiver = args.sender;
        transactions.push(transaction);

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

    esdtTransferProxyBatch(
        batchArgs: TokensTransferArgs[],
    ): Promise<TransactionModel>[] {
        return batchArgs.map(args =>
            this.esdtTransferProxy({
                pairAddress: args.pairAddress,
                sender: args.sender,
                tokenID: args.tokenID,
                tokenNonce: args.tokenNonce,
                amount: args.amount,
            }),
        );
    }

    async esdtTransferProxy(
        args: TokensTransferArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        if (!args.tokenNonce) {
            const transactionArgs = [
                BytesValue.fromUTF8(args.tokenID),
                new BigUIntValue(new BigNumber(args.amount)),
                BytesValue.fromUTF8('acceptEsdtPaymentProxy'),
                BytesValue.fromHex(new Address(args.pairAddress).hex()),
            ];

            return this.context.esdtTransfer(
                contract,
                transactionArgs,
                new GasLimit(gasConfig.acceptEsdtPaymentProxy),
            );
        }

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenID),
            new U32Value(args.tokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('acceptEsdtPaymentProxy'),
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
        ];

        const transaction = this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.acceptEsdtPaymentProxy),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async reclaimTemporaryFundsProxy(
        args: ReclaimTemporaryFundsProxyArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const wrappedTokenID = await this.wrapService.getWrappedEgldTokenID();
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methods.reclaimTemporaryFundsProxy(
            [
                BytesValue.fromUTF8(args.firstTokenID),
                new U32Value(args.firstTokenNonce ? args.firstTokenNonce : 0),
                BytesValue.fromUTF8(args.secondTokenID),
                new U32Value(args.secondTokenNonce ? args.secondTokenNonce : 0),
            ],
        );

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(
            new GasLimit(gasConfig.reclaimTemporaryFundsProxy),
        );

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
                        args.secondTokenAmount,
                    ),
                );
            default:
                break;
        }

        return transactions;
    }
}
