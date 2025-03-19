import {
    BigUIntValue,
    EnumValue,
    Token,
    TokenTransfer,
    U64Value,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { mxConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import {
    FarmRewardType,
    FarmVersion,
} from 'src/modules/farm/models/farm.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { DecodeAttributesModel } from 'src/modules/proxy/models/proxy.args';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { farmType, farmVersion } from 'src/utils/farm.utils';
import { FarmTypeEnumType } from '../models/simple.lock.model';
import { SimpleLockService } from './simple.lock.service';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { SimpleLockAbiService } from './simple.lock.abi.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class SimpleLockTransactionService {
    constructor(
        protected readonly simpleLockService: SimpleLockService,
        protected readonly simpleLockAbi: SimpleLockAbiService,
        protected readonly pairService: PairService,
        protected readonly pairAbi: PairAbiService,
        protected readonly wrapAbi: WrapAbiService,
        protected readonly wrapTransaction: WrapTransactionsService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly mxProxy: MXProxyService,
    ) {}

    async lockTokens(
        sender: string,
        inputTokens: InputTokenModel,
        lockEpochs: number,
        simpleLockAddress: string,
    ): Promise<TransactionModel> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        const unlockEpoch = currentEpoch + lockEpochs;

        return this.mxProxy.getSimpleLockSmartContractTransaction(
            simpleLockAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.simpleLock.lockTokens,
                function: 'lockTokens',
                arguments: [new U64Value(new BigNumber(unlockEpoch))],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputTokens.tokenID,
                        }),
                        amount: BigInt(inputTokens.amount),
                    }),
                ],
            }),
        );
    }

    async unlockTokens(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel,
    ): Promise<TransactionModel> {
        return this.mxProxy.getSimpleLockSmartContractTransaction(
            simpleLockAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.simpleLock.unlockTokens,
                function: 'unlockTokens',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputTokens.tokenID,
                            nonce: BigInt(inputTokens.nonce),
                        }),
                        amount: BigInt(inputTokens.amount),
                    }),
                ],
            }),
        );
    }

    async addLiquidityLockedTokenBatch(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel[],
        pairAddress: string,
        tolerance: number,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];
        const wrappedTokenID = await this.wrapAbi.wrappedEgldTokenID();

        if (inputTokens.length !== 2) {
            throw new Error('Invalid input tokens length');
        }

        const [firstTokenInput, secondTokenInput] = inputTokens;

        switch (mxConfig.EGLDIdentifier) {
            case firstTokenInput.tokenID:
                firstTokenInput.tokenID = wrappedTokenID;
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        firstTokenInput.amount,
                    ),
                );
                break;
            case secondTokenInput.tokenID:
                secondTokenInput.tokenID = wrappedTokenID;
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        secondTokenInput.amount,
                    ),
                );
            default:
                break;
        }

        transactions.push(
            await this.addLiquidityLockedToken(
                simpleLockAddress,
                sender,
                [firstTokenInput, secondTokenInput],
                pairAddress,
                tolerance,
            ),
        );
        return transactions;
    }

    async addLiquidityLockedToken(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel[],
        pairAddress: string,
        tolerance: number,
    ): Promise<TransactionModel> {
        let [firstInputToken, secondInputToken] = inputTokens;

        const [pairFirstTokenID, pairSecondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
        ]);

        let [firstTokenID, secondTokenID] = [
            firstInputToken.tokenID,
            secondInputToken.tokenID,
        ];
        if (firstInputToken.attributes) {
            const decodedAttributes =
                this.simpleLockService.decodeLockedTokenAttributes({
                    identifier: firstInputToken.tokenID,
                    attributes: firstInputToken.attributes,
                });
            firstTokenID = decodedAttributes.originalTokenID;
        }
        if (secondInputToken.attributes) {
            const decodedAttributes =
                this.simpleLockService.decodeLockedTokenAttributes({
                    identifier: secondInputToken.tokenID,
                    attributes: secondInputToken.attributes,
                });
            secondTokenID = decodedAttributes.originalTokenID;
        }

        if (
            firstTokenID !== pairFirstTokenID ||
            secondTokenID !== pairSecondTokenID
        ) {
            [firstInputToken, secondInputToken] = [
                secondInputToken,
                firstInputToken,
            ];
        }

        const amount0 = new BigNumber(firstInputToken.amount);
        const amount1 = new BigNumber(secondInputToken.amount);

        const amount0Min = amount0.multipliedBy(1 - tolerance).integerValue();
        const amount1Min = amount1.multipliedBy(1 - tolerance).integerValue();

        return this.mxProxy.getSimpleLockSmartContractTransaction(
            simpleLockAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.simpleLock.addLiquidityLockedToken,
                function: 'addLiquidityLockedToken',
                arguments: [
                    new BigUIntValue(amount0Min),
                    new BigUIntValue(amount1Min),
                ],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: firstInputToken.tokenID,
                            nonce: BigInt(firstInputToken.nonce),
                        }),
                        amount: BigInt(firstInputToken.amount),
                    }),
                    new TokenTransfer({
                        token: new Token({
                            identifier: secondInputToken.tokenID,
                            nonce: BigInt(secondInputToken.nonce),
                        }),
                        amount: BigInt(secondInputToken.amount),
                    }),
                ],
            }),
        );
    }

    async removeLiquidityLockedToken(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel,
        attributes: string,
        tolerance: number,
    ): Promise<TransactionModel[]> {
        const transactions = [];

        const lpProxyTokenAttributes =
            this.simpleLockService.decodeLpProxyTokenAttributes({
                attributes: attributes,
                identifier: inputTokens.tokenID,
            });

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            lpProxyTokenAttributes.lpTokenID,
        );
        const liquidityPosition = await this.pairService.getLiquidityPosition(
            pairAddress,
            inputTokens.amount,
        );

        const amount0Min = new BigNumber(
            liquidityPosition.firstTokenAmount.toString(),
        )
            .multipliedBy(1 - tolerance)
            .integerValue();
        const amount1Min = new BigNumber(
            liquidityPosition.secondTokenAmount.toString(),
        )
            .multipliedBy(1 - tolerance)
            .integerValue();

        const transaction =
            await this.mxProxy.getSimpleLockSmartContractTransaction(
                simpleLockAddress,
                new TransactionOptions({
                    sender: sender,
                    gasLimit: gasConfig.simpleLock.removeLiquidityLockedToken,
                    function: 'removeLiquidityLockedToken',
                    arguments: [
                        new BigUIntValue(amount0Min),
                        new BigUIntValue(amount1Min),
                    ],
                    tokenTransfers: [
                        new TokenTransfer({
                            token: new Token({
                                identifier: inputTokens.tokenID,
                                nonce: BigInt(inputTokens.nonce),
                            }),
                            amount: BigInt(inputTokens.amount),
                        }),
                    ],
                }),
            );
        transactions.push(transaction);

        return transactions;
    }

    async enterFarmLockedToken(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel[],
        farmAddress: string,
    ): Promise<TransactionModel> {
        let farmTypeDiscriminant: number;
        const version = farmVersion(farmAddress);
        if (version === FarmVersion.V2) {
            farmTypeDiscriminant = 2;
        } else {
            switch (farmType(farmAddress)) {
                case FarmRewardType.UNLOCKED_REWARDS:
                    farmTypeDiscriminant = 0;
                    break;
                case FarmRewardType.LOCKED_REWARDS:
                    farmTypeDiscriminant = 1;
                    break;
            }
        }

        await this.validateInputEnterFarmProxyToken(
            inputTokens,
            FarmTypeEnumType.getVariantByDiscriminant(farmTypeDiscriminant)
                .name,
        );

        const gasLimit =
            inputTokens.length > 1
                ? gasConfig.simpleLock.enterFarmLockedToken.withTokenMerge
                : gasConfig.simpleLock.enterFarmLockedToken.default;

        return this.mxProxy.getSimpleLockSmartContractTransaction(
            simpleLockAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'enterFarmLockedToken',
                arguments: [
                    EnumValue.fromDiscriminant(
                        FarmTypeEnumType,
                        farmTypeDiscriminant,
                    ),
                ],
                tokenTransfers: inputTokens.map(
                    (inputToken) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: inputToken.tokenID,
                                nonce: BigInt(inputToken.nonce),
                            }),
                            amount: BigInt(inputToken.amount),
                        }),
                ),
            }),
        );
    }

    async exitFarmLockedToken(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel,
        farmVersion: FarmVersion,
        exitAmount?: string,
    ): Promise<TransactionModel> {
        if (!exitAmount && farmVersion === FarmVersion.V2) {
            throw new Error('Invalid exit amount!');
        }

        await this.validateInputFarmProxyToken(inputTokens, simpleLockAddress);

        return this.mxProxy.getSimpleLockSmartContractTransaction(
            simpleLockAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.simpleLock.exitFarmLockedToken,
                function: 'exitFarmLockedToken',
                arguments:
                    farmVersion === FarmVersion.V2
                        ? [new BigUIntValue(new BigNumber(exitAmount))]
                        : [],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputTokens.tokenID,
                            nonce: BigInt(inputTokens.nonce),
                        }),
                        amount: BigInt(inputTokens.amount),
                    }),
                ],
            }),
        );
    }

    async farmClaimRewardsLockedToken(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel,
    ): Promise<TransactionModel> {
        await this.validateInputFarmProxyToken(inputTokens, simpleLockAddress);

        return this.mxProxy.getSimpleLockSmartContractTransaction(
            simpleLockAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.simpleLock.claimRewardsFarmLockedToken,
                function: 'farmClaimRewardsLockedToken',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputTokens.tokenID,
                            nonce: BigInt(inputTokens.nonce),
                        }),
                        amount: BigInt(inputTokens.amount),
                    }),
                ],
            }),
        );
    }

    async exitFarmOldToken(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel,
    ): Promise<TransactionModel> {
        await this.validateInputFarmProxyToken(inputTokens, simpleLockAddress);

        return this.mxProxy.getSimpleLockSmartContractTransaction(
            simpleLockAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.simpleLock.exitFarmLockedToken,
                function: 'exitFarmOldToken',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputTokens.tokenID,
                            nonce: BigInt(inputTokens.nonce),
                        }),
                        amount: BigInt(inputTokens.amount),
                    }),
                ],
            }),
        );
    }

    private async validateInputEnterFarmProxyToken(
        inputTokens: InputTokenModel[],
        farmType: string,
    ): Promise<void> {
        const lpProxyToken = inputTokens[0];

        const decodeAttributesArgs: DecodeAttributesModel[] = [];
        for (const inputToken of inputTokens.slice(1)) {
            decodeAttributesArgs.push({
                attributes: inputToken.attributes,
                identifier: inputToken.tokenID,
            });
        }

        const lpProxyTokenAttributes =
            this.simpleLockService.decodeLpProxyTokenAttributes({
                attributes: lpProxyToken.attributes,
                identifier: lpProxyToken.tokenID,
            });
        const decodedAttributesBatch =
            this.simpleLockService.decodeBatchFarmProxyTokenAttributes({
                batchAttributes: decodeAttributesArgs,
            });

        for (const decodedAttributes of decodedAttributesBatch) {
            const sameFarmingToken =
                decodedAttributes.farmingTokenID ===
                lpProxyTokenAttributes.lpTokenID;
            const sameFarmingTokenNonce =
                decodedAttributes.farmingTokenLockedNonce ===
                lpProxyToken.nonce;
            const sameFarmType = decodedAttributes.farmType === farmType;
            if (!(sameFarmingToken && sameFarmingTokenNonce && sameFarmType)) {
                throw new Error('Invalid farm proxy token');
            }
        }
    }

    private async validateInputFarmProxyToken(
        inputTokens: InputTokenModel,
        simpleLockAddress: string,
    ): Promise<void> {
        const farmProxyTokenID = await this.simpleLockAbi.farmProxyTokenID(
            simpleLockAddress,
        );

        if (inputTokens.tokenID !== farmProxyTokenID || inputTokens.nonce < 1) {
            throw new Error('Invalid input token');
        }
    }
}
