import { Injectable } from '@nestjs/common';
import {
    AddressValue,
    BigUIntValue,
    TypedValue,
    U64Value,
} from '@multiversx/sdk-core/out/smartcontracts/typesystem';
import { BytesValue } from '@multiversx/sdk-core/out/smartcontracts/typesystem/bytes';
import { Address, TokenTransfer } from '@multiversx/sdk-core';
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

@Injectable()
export class PairTransactionService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly pairService: PairService,
        private readonly pairAbi: PairAbiService,
        private readonly wrapAbi: WrapAbiService,
        private readonly wrapTransaction: WrapTransactionsService,
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

        const contract = await this.mxProxy.getPairSmartContract(
            args.pairAddress,
        );

        return contract.methodsExplicit
            .addInitialLiquidity()
            .withMultiESDTNFTTransfer([
                TokenTransfer.fungibleFromBigInteger(
                    firstTokenInput.tokenID,
                    new BigNumber(firstTokenInput.amount),
                ),
                TokenTransfer.fungibleFromBigInteger(
                    secondTokenInput.tokenID,
                    new BigNumber(secondTokenInput.amount),
                ),
            ])
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.pairs.addLiquidity)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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

        const contract = await this.mxProxy.getPairSmartContract(
            args.pairAddress,
        );

        const endpointArgs: TypedValue[] = [
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        return contract.methodsExplicit
            .addLiquidity(endpointArgs)
            .withMultiESDTNFTTransfer([
                TokenTransfer.fungibleFromBigInteger(
                    firstTokenInput.tokenID,
                    new BigNumber(firstTokenInput.amount),
                ),
                TokenTransfer.fungibleFromBigInteger(
                    secondTokenInput.tokenID,
                    new BigNumber(secondTokenInput.amount),
                ),
            ])
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.pairs.addLiquidity)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
            this.wrapAbi.wrappedEgldTokenID(),
            this.pairAbi.firstTokenID(args.pairAddress),
            this.pairAbi.secondTokenID(args.pairAddress),
            this.pairService.getLiquidityPosition(
                args.pairAddress,
                args.liquidity,
            ),
            this.mxProxy.getPairSmartContract(args.pairAddress),
        ]);

        const amount0Min = new BigNumber(liquidityPosition.firstTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = new BigNumber(liquidityPosition.secondTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const endpointArgs = [
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];
        transactions.push(
            contract.methodsExplicit
                .removeLiquidity(endpointArgs)
                .withSingleESDTTransfer(
                    TokenTransfer.fungibleFromBigInteger(
                        args.liquidityTokenID,
                        new BigNumber(args.liquidity),
                    ),
                )
                .withGasLimit(gasConfig.pairs.removeLiquidity)
                .withChainID(mxConfig.chainID)
                .buildTransaction()
                .toPlainObject(),
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async swapTokensFixedInput(
        sender: string,
        args: SwapTokensFixedInputArgs,
    ): Promise<TransactionModel[]> {
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
        const transactions = [];
        let endpointArgs: TypedValue[];
        const [wrappedTokenID, contract, trustedSwapPairs] = await Promise.all([
            this.wrapAbi.wrappedEgldTokenID(),
            this.mxProxy.getPairSmartContract(args.pairAddress),
            this.pairAbi.trustedSwapPairs(args.pairAddress),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);
        const amountOutMin = new BigNumber(1)
            .dividedBy(new BigNumber(1).plus(args.tolerance))
            .multipliedBy(amountOut)
            .integerValue();

        const gasLimit =
            trustedSwapPairs.length === 0
                ? gasConfig.pairs.swapTokensFixedInput.default
                : gasConfig.pairs.swapTokensFixedInput.withFeeSwap;

        switch (mxConfig.EGLDIdentifier) {
            case args.tokenInID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(sender, args.amountIn),
                );
                endpointArgs = [
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOutMin),
                ];
                transactions.push(
                    contract.methodsExplicit
                        .swapTokensFixedInput(endpointArgs)
                        .withSingleESDTTransfer(
                            TokenTransfer.fungibleFromBigInteger(
                                wrappedTokenID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(mxConfig.chainID)
                        .buildTransaction()
                        .toPlainObject(),
                );
                break;
            case args.tokenOutID:
                endpointArgs = [
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountOutMin),
                ];
                transactions.push(
                    contract.methodsExplicit
                        .swapTokensFixedInput(endpointArgs)
                        .withSingleESDTTransfer(
                            TokenTransfer.fungibleFromBigInteger(
                                args.tokenInID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(mxConfig.chainID)
                        .buildTransaction()
                        .toPlainObject(),
                );
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amountOutMin.toString(),
                    ),
                );
                break;
            default:
                endpointArgs = [
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOutMin),
                ];

                transactions.push(
                    contract.methodsExplicit
                        .swapTokensFixedInput(endpointArgs)
                        .withSingleESDTTransfer(
                            TokenTransfer.fungibleFromBigInteger(
                                args.tokenInID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(mxConfig.chainID)
                        .buildTransaction()
                        .toPlainObject(),
                );
                break;
        }

        return transactions;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async swapTokensFixedOutput(
        sender: string,
        args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel[]> {
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

        const transactions: TransactionModel[] = [];
        let endpointArgs: TypedValue[];
        const [wrappedTokenID, contract, trustedSwapPairs] = await Promise.all([
            this.wrapAbi.wrappedEgldTokenID(),
            this.mxProxy.getPairSmartContract(args.pairAddress),
            this.pairAbi.trustedSwapPairs(args.pairAddress),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);

        const gasLimit =
            trustedSwapPairs.length === 0
                ? gasConfig.pairs.swapTokensFixedOutput.default
                : gasConfig.pairs.swapTokensFixedOutput.withFeeSwap;

        switch (mxConfig.EGLDIdentifier) {
            case args.tokenInID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        amountIn.toString(),
                    ),
                );

                endpointArgs = [
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOut),
                ];

                transactions.push(
                    contract.methodsExplicit
                        .swapTokensFixedOutput(endpointArgs)
                        .withSingleESDTTransfer(
                            TokenTransfer.fungibleFromBigInteger(
                                wrappedTokenID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(mxConfig.chainID)
                        .buildTransaction()
                        .toPlainObject(),
                );
                break;
            case args.tokenOutID:
                endpointArgs = [
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountOut),
                ];
                transactions.push(
                    contract.methodsExplicit
                        .swapTokensFixedOutput(endpointArgs)
                        .withSingleESDTTransfer(
                            TokenTransfer.fungibleFromBigInteger(
                                args.tokenInID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(mxConfig.chainID)
                        .buildTransaction()
                        .toPlainObject(),
                );
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        args.amountOut,
                    ),
                );
                break;
            default:
                endpointArgs = [
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOut),
                ];

                transactions.push(
                    contract.methodsExplicit
                        .swapTokensFixedOutput(endpointArgs)
                        .withSingleESDTTransfer(
                            TokenTransfer.fungibleFromBigInteger(
                                args.tokenInID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(mxConfig.chainID)
                        .buildTransaction()
                        .toPlainObject(),
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
        switch (mxConfig.EGLDIdentifier) {
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

    async whitelist(args: WhitelistArgs): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(
            args.pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new AddressValue(Address.fromString(args.address)),
        ];
        return contract.methodsExplicit
            .whitelist(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.whitelist)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async removeWhitelist(args: WhitelistArgs): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(
            args.pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new AddressValue(Address.fromString(args.address)),
        ];
        return contract.methodsExplicit
            .removeWhitelist(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.removeWhitelist)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async addTrustedSwapPair(
        pairAddress: string,
        swapPairAddress: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(pairAddress);
        const transactionArgs: TypedValue[] = [
            BytesValue.fromHex(new Address(swapPairAddress).hex()),
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ];
        return contract.methodsExplicit
            .addTrustedSwapPair(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.addTrustedSwapPair)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async removeTrustedSwapPair(
        pairAddress: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(pairAddress);
        const transactionArgs: TypedValue[] = [
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ];
        return contract.methodsExplicit
            .removeTrustedSwapPair(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.removeTrustedSwapPair)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async pause(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(pairAddress);
        return contract.methodsExplicit
            .pause()
            .withGasLimit(gasConfig.pairs.admin.pause)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async resume(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(pairAddress);
        return contract.methodsExplicit
            .resume()
            .withGasLimit(gasConfig.pairs.admin.resume)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setStateActiveNoSwaps(
        pairAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(pairAddress);
        return contract.methodsExplicit
            .setStateActiveNoSwaps()
            .withGasLimit(gasConfig.pairs.admin.setStateActiveNoSwaps)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setFeePercents(
        pairAddress: string,
        totalFeePercent: number,
        specialFeePercent: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(pairAddress);
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(totalFeePercent)),
            new BigUIntValue(new BigNumber(specialFeePercent)),
        ];
        return contract.methodsExplicit
            .setFeePercents(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setFeePercents)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setLockingDeadlineEpoch(
        pairAddress: string,
        newDeadline: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(pairAddress);
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(newDeadline)),
        ];
        return contract.methodsExplicit
            .setLockingDeadlineEpoch(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setLockingDeadlineEpoch)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setUnlockEpoch(
        pairAddress: string,
        newEpoch: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(pairAddress);
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(newEpoch)),
        ];
        return contract.methodsExplicit
            .setUnlockEpoch(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setUnlockEpoch)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setLockingScAddress(
        pairAddress: string,
        newAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(pairAddress);
        const transactionArgs: TypedValue[] = [
            BytesValue.fromHex(new Address(newAddress).hex()),
        ];
        return contract.methodsExplicit
            .setLockingScAddress(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setLockingScAddress)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setupFeesCollector(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getPairSmartContract(pairAddress);
        return contract.methodsExplicit
            .setupFeesCollector([
                new AddressValue(Address.fromString(scAddress.feesCollector)),
                new U64Value(new BigNumber(constantsConfig.FEES_COLLECTOR_CUT)),
            ])
            .withGasLimit(gasConfig.pairs.admin.setupFeesCollector)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
