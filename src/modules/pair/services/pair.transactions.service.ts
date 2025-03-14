import { Injectable } from '@nestjs/common';
import {
    Address,
    AddressValue,
    BigUIntValue,
    BytesValue,
    Token,
    TokenTransfer,
    U64Value,
} from '@multiversx/sdk-core';
import { mxConfig, gasConfig, scAddress, constantsConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import {
    AddLiquidityArgs,
    RemoveLiquidityArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
    WhitelistArgs,
} from '../models/pair.args';
import BigNumber from 'bignumber.js';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { PairService } from './pair.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';
import { PairAbiService } from './pair.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { ComposableTasksTransactionService } from 'src/modules/composable-tasks/services/composable.tasks.transaction';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { PairComputeService } from './pair.compute.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class PairTransactionService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly pairService: PairService,
        private readonly pairAbi: PairAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly wrapAbi: WrapAbiService,
        private readonly wrapTransaction: WrapTransactionsService,
        private readonly composableTasksTransaction: ComposableTasksTransactionService,
    ) {}

    async addInitialLiquidityBatch(
        sender: string,
        args: AddLiquidityArgs,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];

        switch (mxConfig.EGLDIdentifier) {
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

        transactions.push(await this.addInitialLiquidity(sender, args));

        return transactions;
    }

    async addLiquidityBatch(
        sender: string,
        args: AddLiquidityArgs,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];

        switch (mxConfig.EGLDIdentifier) {
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async addInitialLiquidity(
        sender: string,
        args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        const initialLiquidityAdder = await this.pairAbi.initialLiquidityAdder(
            args.pairAddress,
        );
        if (sender != initialLiquidityAdder) {
            throw new Error('Invalid sender address');
        }

        const [firstTokenInput, secondTokenInput] = await this.validateTokens(
            args.pairAddress,
            args.tokens,
        );

        const minimumAmount = new BigNumber(firstTokenInput.amount).isLessThan(
            secondTokenInput.amount,
        )
            ? new BigNumber(firstTokenInput.amount)
            : new BigNumber(secondTokenInput.amount);

        if (minimumAmount.isLessThan(10 ** 3)) {
            throw new Error(
                'First tokens needs to be greater than minimum liquidity',
            );
        }

        const permanentLockedAmountUSD =
            await this.pairCompute.computePermanentLockedValueUSD(
                args.pairAddress,
                new BigNumber(firstTokenInput.amount),
                new BigNumber(secondTokenInput.amount),
            );

        if (permanentLockedAmountUSD.isGreaterThan(1)) {
            throw new Error('Permanent locked amount must be less than 1 USD');
        }

        return this.mxProxy.getPairSmartContractTransaction(
            args.pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.addLiquidity,
                function: 'addInitialLiquidity',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: firstTokenInput.tokenID,
                        }),
                        amount: BigInt(firstTokenInput.amount),
                    }),
                    new TokenTransfer({
                        token: new Token({
                            identifier: secondTokenInput.tokenID,
                        }),
                        amount: BigInt(secondTokenInput.amount),
                    }),
                ],
            }),
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async addLiquidity(
        sender: string,
        args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        const [firstTokenInput, secondTokenInput] = await this.validateTokens(
            args.pairAddress,
            args.tokens,
        );

        const amount0 = new BigNumber(firstTokenInput.amount);
        const amount1 = new BigNumber(secondTokenInput.amount);

        const amount0Min = amount0
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = amount1
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        return this.mxProxy.getPairSmartContractTransaction(
            args.pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.addLiquidity,
                function: 'addLiquidity',
                arguments: [
                    new BigUIntValue(amount0Min),
                    new BigUIntValue(amount1Min),
                ],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: firstTokenInput.tokenID,
                        }),
                        amount: BigInt(firstTokenInput.amount),
                    }),
                    new TokenTransfer({
                        token: new Token({
                            identifier: secondTokenInput.tokenID,
                        }),
                        amount: BigInt(secondTokenInput.amount),
                    }),
                ],
            }),
        );
    }

    async removeLiquidity(
        sender: string,
        args: RemoveLiquidityArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const [wrappedTokenID, firstTokenID, secondTokenID, liquidityPosition] =
            await Promise.all([
                this.wrapAbi.wrappedEgldTokenID(),
                this.pairAbi.firstTokenID(args.pairAddress),
                this.pairAbi.secondTokenID(args.pairAddress),
                this.pairService.getLiquidityPosition(
                    args.pairAddress,
                    args.liquidity,
                ),
            ]);

        const amount0Min = new BigNumber(liquidityPosition.firstTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = new BigNumber(liquidityPosition.secondTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const transaction = await this.mxProxy.getPairSmartContractTransaction(
            args.pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.removeLiquidity,
                function: 'removeLiquidity',
                arguments: [
                    new BigUIntValue(amount0Min),
                    new BigUIntValue(amount1Min),
                ],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.liquidityTokenID,
                        }),
                        amount: BigInt(args.liquidity),
                    }),
                ],
            }),
        );
        transactions.push(transaction);

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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async swapTokensFixedInput(
        sender: string,
        args: SwapTokensFixedInputArgs,
    ): Promise<TransactionModel> {
        await this.validateTokens(args.pairAddress, [
            new InputTokenModel({
                tokenID: args.tokenInID,
                nonce: 0,
            }),
            new InputTokenModel({
                tokenID: args.tokenOutID,
                nonce: 0,
            }),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);
        const amountOutMin = new BigNumber(1)
            .dividedBy(new BigNumber(1).plus(args.tolerance))
            .multipliedBy(amountOut)
            .integerValue();

        if (args.tokenInID === mxConfig.EGLDIdentifier) {
            return this.composableTasksTransaction.wrapEgldAndSwapTransaction(
                sender,
                args.amountIn,
                args.tokenOutID,
                amountOutMin.toFixed(),
                'swapTokensFixedInput',
            );
        }

        if (args.tokenOutID === mxConfig.EGLDIdentifier) {
            return this.composableTasksTransaction.swapAndUnwrapEgldTransaction(
                sender,
                new EsdtTokenPayment({
                    tokenIdentifier: args.tokenInID,
                    tokenNonce: 0,
                    amount: args.amountIn,
                }),
                amountOutMin.toFixed(),
                'swapTokensFixedInput',
            );
        }

        const trustedSwapPairs = await this.pairAbi.trustedSwapPairs(
            args.pairAddress,
        );

        const gasLimit =
            trustedSwapPairs.length === 0
                ? gasConfig.pairs.swapTokensFixedInput.default
                : gasConfig.pairs.swapTokensFixedInput.withFeeSwap;

        return this.mxProxy.getPairSmartContractTransaction(
            args.pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasLimit,
                function: 'swapTokensFixedInput',
                arguments: [
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOutMin),
                ],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.tokenInID,
                        }),
                        amount: BigInt(amountIn.integerValue().toFixed()),
                    }),
                ],
            }),
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async swapTokensFixedOutput(
        sender: string,
        args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel> {
        await this.validateTokens(args.pairAddress, [
            new InputTokenModel({
                tokenID: args.tokenInID,
                nonce: 0,
            }),
            new InputTokenModel({
                tokenID: args.tokenOutID,
                nonce: 0,
            }),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);

        if (args.tokenInID === mxConfig.EGLDIdentifier) {
            return this.composableTasksTransaction.wrapEgldAndSwapTransaction(
                sender,
                args.amountIn,
                args.tokenOutID,
                args.amountOut,
                'swapTokensFixedOutput',
            );
        }

        if (args.tokenOutID === mxConfig.EGLDIdentifier) {
            return this.composableTasksTransaction.swapAndUnwrapEgldTransaction(
                sender,
                new EsdtTokenPayment({
                    tokenIdentifier: args.tokenInID,
                    tokenNonce: 0,
                    amount: args.amountIn,
                }),
                args.amountOut,
                'swapTokensFixedOutput',
            );
        }

        const trustedSwapPairs = await this.pairAbi.trustedSwapPairs(
            args.pairAddress,
        );

        const gasLimit =
            trustedSwapPairs.length === 0
                ? gasConfig.pairs.swapTokensFixedOutput.default
                : gasConfig.pairs.swapTokensFixedOutput.withFeeSwap;

        return this.mxProxy.getPairSmartContractTransaction(
            args.pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasLimit,
                function: 'swapTokensFixedOutput',
                arguments: [
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOut),
                ],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.tokenInID,
                        }),
                        amount: BigInt(amountIn.integerValue().toFixed()),
                    }),
                ],
            }),
        );
    }

    async validateTokens(
        pairAddress: string,
        tokens: InputTokenModel[],
    ): Promise<InputTokenModel[]> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
        ]);

        if (tokens[0].nonce > 0 || tokens[1].nonce > 0) {
            throw new Error('Only ESDT tokens allowed!');
        }

        if (
            tokens[0].tokenID === mxConfig.EGLDIdentifier ||
            tokens[1].tokenID === mxConfig.EGLDIdentifier
        ) {
            return this.getTokensWithEGLD(tokens, firstTokenID, secondTokenID);
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
        switch (mxConfig.EGLDIdentifier) {
            case tokens[0].tokenID:
                return this.getTokensInOrder(
                    tokens[1],
                    tokens[0],
                    firstTokenID,
                    secondTokenID,
                );
            case tokens[1].tokenID:
                return this.getTokensInOrder(
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
        const wrappedTokenID = await this.wrapAbi.wrappedEgldTokenID();
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

    async whitelist(
        sender: string,
        args: WhitelistArgs,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            args.pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.whitelist,
                function: 'whitelist',
                arguments: [
                    new AddressValue(Address.newFromBech32(args.address)),
                ],
            }),
        );
    }

    async removeWhitelist(
        sender: string,
        args: WhitelistArgs,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            args.pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.removeWhitelist,
                function: 'removeWhitelist',
                arguments: [
                    new AddressValue(Address.newFromBech32(args.address)),
                ],
            }),
        );
    }

    async addTrustedSwapPair(
        sender: string,
        pairAddress: string,
        swapPairAddress: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.addTrustedSwapPair,
                function: 'addTrustedSwapPair',
                arguments: [
                    BytesValue.fromHex(
                        Address.newFromBech32(swapPairAddress).toHex(),
                    ),
                    BytesValue.fromUTF8(firstTokenID),
                    BytesValue.fromUTF8(secondTokenID),
                ],
            }),
        );
    }

    async removeTrustedSwapPair(
        sender: string,
        pairAddress: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.removeTrustedSwapPair,
                function: 'removeTrustedSwapPair',
                arguments: [
                    BytesValue.fromUTF8(firstTokenID),
                    BytesValue.fromUTF8(secondTokenID),
                ],
            }),
        );
    }

    async pause(
        sender: string,
        pairAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.pause,
                function: 'pause',
            }),
        );
    }

    async resume(
        sender: string,
        pairAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.resume,
                function: 'resume',
            }),
        );
    }

    async setStateActiveNoSwaps(
        sender: string,
        pairAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.setStateActiveNoSwaps,
                function: 'setStateActiveNoSwaps',
            }),
        );
    }

    async setFeePercents(
        sender: string,
        pairAddress: string,
        totalFeePercent: number,
        specialFeePercent: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.setFeePercents,
                function: 'setFeePercents',
                arguments: [
                    new BigUIntValue(new BigNumber(totalFeePercent)),
                    new BigUIntValue(new BigNumber(specialFeePercent)),
                ],
            }),
        );
    }

    async setLockingDeadlineEpoch(
        sender: string,
        pairAddress: string,
        newDeadline: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.setLockingDeadlineEpoch,
                function: 'setLockingDeadlineEpoch',
                arguments: [new BigUIntValue(new BigNumber(newDeadline))],
            }),
        );
    }

    async setUnlockEpoch(
        sender: string,
        pairAddress: string,
        newEpoch: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.setUnlockEpoch,
                function: 'setUnlockEpoch',
                arguments: [new BigUIntValue(new BigNumber(newEpoch))],
            }),
        );
    }

    async setLockingScAddress(
        sender: string,
        pairAddress: string,
        newAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.setLockingScAddress,
                function: 'setLockingScAddress',
                arguments: [
                    BytesValue.fromHex(
                        Address.newFromBech32(newAddress).toHex(),
                    ),
                ],
            }),
        );
    }

    async setupFeesCollector(
        sender: string,
        pairAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getPairSmartContractTransaction(
            pairAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.pairs.admin.setupFeesCollector,
                function: 'setupFeesCollector',
                arguments: [
                    new AddressValue(
                        Address.newFromBech32(scAddress.feesCollector),
                    ),
                    new U64Value(
                        new BigNumber(constantsConfig.FEES_COLLECTOR_CUT),
                    ),
                ],
            }),
        );
    }
}
