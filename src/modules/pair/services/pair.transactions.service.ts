import { Inject, Injectable } from '@nestjs/common';
import {
    AddressValue,
    BigUIntValue,
    TypedValue,
    U64Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Address, Interaction, TokenPayment } from '@elrondnetwork/erdjs';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import {
    AddLiquidityArgs,
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

@Injectable()
export class PairTransactionService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
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

        let firstTokenInput: InputTokenModel, secondTokenInput: InputTokenModel;
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

        return contract.methodsExplicit
            .addInitialLiquidity()
            .withMultiESDTNFTTransfer(
                [
                    TokenPayment.fungibleFromBigInteger(
                        firstTokenInput.tokenID,
                        new BigNumber(firstTokenInput.amount),
                    ),
                    TokenPayment.fungibleFromBigInteger(
                        secondTokenInput.tokenID,
                        new BigNumber(secondTokenInput.amount),
                    ),
                ],
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.pairs.addLiquidity)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async addLiquidity(
        sender: string,
        args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        let firstTokenInput: InputTokenModel, secondTokenInput: InputTokenModel;
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

        return contract.methodsExplicit
            .addLiquidity(endpointArgs)
            .withMultiESDTNFTTransfer(
                [
                    TokenPayment.fungibleFromBigInteger(
                        firstTokenInput.tokenID,
                        new BigNumber(firstTokenInput.amount),
                    ),
                    TokenPayment.fungibleFromBigInteger(
                        secondTokenInput.tokenID,
                        new BigNumber(secondTokenInput.amount),
                    ),
                ],
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.pairs.addLiquidity)
            .withChainID(elrondConfig.chainID)
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

        const endpointArgs = [
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];
        transactions.push(
            contract.methodsExplicit
                .removeLiquidity(endpointArgs)
                .withSingleESDTTransfer(
                    TokenPayment.fungibleFromBigInteger(
                        args.liquidityTokenID,
                        new BigNumber(args.liquidity),
                    ),
                )
                .withGasLimit(gasConfig.pairs.removeLiquidity)
                .withChainID(elrondConfig.chainID)
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

    async swapTokensFixedInput(
        sender: string,
        args: SwapTokensFixedInputArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        let endpointArgs: TypedValue[];
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

        const gasLimit =
            trustedSwapPairs.length === 0
                ? gasConfig.pairs.swapTokensFixedInput.default
                : gasConfig.pairs.swapTokensFixedInput.withFeeSwap;

        switch (elrondConfig.EGLDIdentifier) {
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
                            TokenPayment.fungibleFromBigInteger(
                                wrappedTokenID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(elrondConfig.chainID)
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
                            TokenPayment.fungibleFromBigInteger(
                                args.tokenInID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(elrondConfig.chainID)
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
                            TokenPayment.fungibleFromBigInteger(
                                args.tokenInID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(elrondConfig.chainID)
                        .buildTransaction()
                        .toPlainObject(),
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
        let endpointArgs: TypedValue[];
        const [wrappedTokenID, contract, trustedSwapPairs] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.elrondProxy.getPairSmartContract(args.pairAddress),
            this.pairGetterService.getTrustedSwapPairs(args.pairAddress),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);

        const gasLimit =
            trustedSwapPairs.length === 0
                ? gasConfig.pairs.swapTokensFixedOutput.default
                : gasConfig.pairs.swapTokensFixedOutput.withFeeSwap;

        switch (elrondConfig.EGLDIdentifier) {
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
                            TokenPayment.fungibleFromBigInteger(
                                wrappedTokenID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(elrondConfig.chainID)
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
                            TokenPayment.fungibleFromBigInteger(
                                args.tokenInID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(elrondConfig.chainID)
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
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOut),
                ];

                transactions.push(
                    contract.methodsExplicit
                        .swapTokensFixedOutput(endpointArgs)
                        .withSingleESDTTransfer(
                            TokenPayment.fungibleFromBigInteger(
                                args.tokenInID,
                                new BigNumber(amountIn),
                            ),
                        )
                        .withGasLimit(gasLimit)
                        .withChainID(elrondConfig.chainID)
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
            new AddressValue(Address.fromString(args.address)),
        ];
        return contract.methodsExplicit
            .whitelist(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.whitelist)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async removeWhitelist(args: WhitelistArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new AddressValue(Address.fromString(args.address)),
        ];
        return contract.methodsExplicit
            .removeWhitelist(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.removeWhitelist)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
        return contract.methodsExplicit
            .addTrustedSwapPair(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.addTrustedSwapPair)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
        return contract.methodsExplicit
            .removeTrustedSwapPair(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.removeTrustedSwapPair)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
        return contract.methodsExplicit
            .set_transfer_exec_gas_limit(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.set_transfer_exec_gas_limit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
        return contract.methodsExplicit
            .set_extern_swap_gas_limit(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.set_extern_swap_gas_limit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async pause(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        return contract.methodsExplicit
            .pause()
            .withGasLimit(gasConfig.pairs.admin.pause)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async resume(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        return contract.methodsExplicit
            .resume()
            .withGasLimit(gasConfig.pairs.admin.resume)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setStateActiveNoSwaps(
        pairAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        return contract.methodsExplicit
            .setStateActiveNoSwaps()
            .withGasLimit(gasConfig.pairs.admin.setStateActiveNoSwaps)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setFeePercents(
        pairAddress: string,
        totalFeePercent: number,
        specialFeePercent: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(totalFeePercent)),
            new BigUIntValue(new BigNumber(specialFeePercent)),
        ];
        return contract.methodsExplicit
            .setFeePercents(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setFeePercents)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setMaxObservationsPerRecord(
        pairAddress: string,
        maxObservationsPerRecord: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(maxObservationsPerRecord)),
        ];
        return contract.methodsExplicit
            .setMaxObservationsPerRecord(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setMaxObservationsPerRecord)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
        return contract.methodsExplicit
            .setBPSwapConfig(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setBPSwapConfig)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
        return contract.methodsExplicit
            .setBPRemoveConfig(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setBPRemoveConfig)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
        return contract.methodsExplicit
            .setBPAddConfig(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setBPAddConfig)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setLockingDeadlineEpoch(
        pairAddress: string,
        newDeadline: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(newDeadline)),
        ];
        return contract.methodsExplicit
            .setLockingDeadlineEpoch(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setLockingDeadlineEpoch)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setUnlockEpoch(
        pairAddress: string,
        newEpoch: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs: TypedValue[] = [
            new BigUIntValue(new BigNumber(newEpoch)),
        ];
        return contract.methodsExplicit
            .setUnlockEpoch(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setUnlockEpoch)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
        return contract.methodsExplicit
            .setLockingScAddress(transactionArgs)
            .withGasLimit(gasConfig.pairs.admin.setLockingScAddress)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
