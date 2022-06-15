import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    TypedValue,
    U64Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import {
    Address,
    ContractFunction,
    GasLimit,
    Interaction,
} from '@elrondnetwork/erdjs';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import {
    AddLiquidityArgs,
    RemoveLiquidityAndBuyBackAndBurnArgs,
    RemoveLiquidityArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
    WhitelistArgs,
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
import { BPConfig } from '../models/pair.model';
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

    async addInitialLiquidityBatch(
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

        transactions.push(await this.addInitialLiquidity(sender, args));

        return transactions;
    }

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

    async addInitialLiquidity(
        sender: string,
        args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        const initialLiquidityAdder = await this.pairGetterService.getInitialLiquidityAdder(
            args.pairAddress,
        );
        if (sender != initialLiquidityAdder) {
            throw new Error('Invalid sender address');
        }

        let firstTokenInput, secondTokenInput: InputTokenModel;
        try {
            [firstTokenInput, secondTokenInput] = await this.validateTokens(
                args.pairAddress,
                args.tokens,
            );
        } catch (error) {
            const logMessage = generateLogMessage(
                PairTransactionService.name,
                this.addInitialLiquidity.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            [firstTokenInput, secondTokenInput],
            'addInitialLiquidity',
            [],
            new GasLimit(gasConfig.pairs.addLiquidity),
        );
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

    async whitelist(args: WhitelistArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            BytesValue.fromHex(new Address(args.address).hex()),
        ];
        const interaction: Interaction = contract.methods.whitelist(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(new GasLimit(gasConfig.pairs.admin.whitelist));
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async removeWhitelist(args: WhitelistArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            BytesValue.fromHex(new Address(args.address).hex()),
        ];
        const interaction: Interaction = contract.methods.removeWhitelist(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.removeWhitelist),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async addTrustedSwapPair(
        pairAddress: string,
        swapPairAddress: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            BytesValue.fromHex(new Address(swapPairAddress).hex()),
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ];
        const interaction: Interaction = contract.methods.addTrustedSwapPair(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.addTrustedSwapPair),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async removeTrustedSwapPair(
        pairAddress: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ];
        const interaction: Interaction = contract.methods.removeTrustedSwapPair(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.removeTrustedSwapPair),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setTransferExecGasLimit(
        pairAddress: string,
        gasLimit: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new U64Value(new BigNumber(gasLimit)),
        ];
        const interaction: Interaction = contract.methods.setTransferExecGasLimit(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.set_transfer_exec_gas_limit),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setExternSwapGasLimit(
        pairAddress: string,
        gasLimit: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new U64Value(new BigNumber(gasLimit)),
        ];
        const interaction: Interaction = contract.methods.setExternSwapGasLimit(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.set_extern_swap_gas_limit),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async pause(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.pause([]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(new GasLimit(gasConfig.pairs.admin.pause));
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async resume(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.resume([]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(new GasLimit(gasConfig.pairs.admin.resume));
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setStateActiveNoSwaps(
        pairAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.setStateActiveNoSwaps(
            [],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.setStateActiveNoSwaps),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setFeePercents(
        pairAddress: string,
        totalFeePercent: string,
        specialFeePercent: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(totalFeePercent)),
            new BigUIntValue(new BigNumber(specialFeePercent)),
        ];
        const interaction: Interaction = contract.methods.setFeePercents(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.setFeePercents),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setMaxObservationsPerRecord(
        pairAddress: string,
        maxObservationsPerRecord: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(maxObservationsPerRecord)),
        ];
        const interaction: Interaction = contract.methods.setMaxObservationsPerRecord(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.setMaxObservationsPerRecord),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setBPSwapConfig(
        pairAddress: string,
        config: BPConfig,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(config.protectStopBlock)),
            new BigUIntValue(new BigNumber(config.volumePercent)),
            new BigUIntValue(new BigNumber(config.maxNumActionsPerAddress)),
        ];
        const interaction: Interaction = contract.methods.setBPSwapConfig(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.setBPSwapConfig),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setBPRemoveConfig(
        pairAddress: string,
        config: BPConfig,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(config.protectStopBlock)),
            new BigUIntValue(new BigNumber(config.volumePercent)),
            new BigUIntValue(new BigNumber(config.maxNumActionsPerAddress)),
        ];
        const interaction: Interaction = contract.methods.setBPRemoveConfig(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.setBPRemoveConfig),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setBPAddConfig(
        pairAddress: string,
        config: BPConfig,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(config.protectStopBlock)),
            new BigUIntValue(new BigNumber(config.volumePercent)),
            new BigUIntValue(new BigNumber(config.maxNumActionsPerAddress)),
        ];
        const interaction: Interaction = contract.methods.setBPAddConfig(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.setBPAddConfig),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setLockingDeadlineEpoch(
        pairAddress: string,
        newDeadline: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(newDeadline)),
        ];
        const interaction: Interaction = contract.methods.setLockingDeadlineEpoch(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.setLockingDeadlineEpoch),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setLockingScAddress(
        pairAddress: string,
        newAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            BytesValue.fromHex(new Address(newAddress).hex()),
        ];
        const interaction: Interaction = contract.methods.setLockingScAddress(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.setLockingScAddress),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setUnlockEpoch(
        pairAddress: string,
        newEpoch: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(newEpoch)),
        ];
        const interaction: Interaction = contract.methods.setUnlockEpoch(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.pairs.admin.setUnlockEpoch),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }
}
