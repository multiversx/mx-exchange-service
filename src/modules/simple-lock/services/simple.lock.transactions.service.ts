import {
    Address,
    BigUIntValue,
    EnumValue,
    Interaction,
    TokenPayment,
    TypedValue,
    U64Value,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { FarmRewardType } from 'src/modules/farm/models/farm.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { DecodeAttributesModel } from 'src/modules/proxy/models/proxy.args';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { farmType } from 'src/utils/farm.utils';
import { FarmTypeEnumType } from '../models/simple.lock.model';
import { SimpleLockGetterService } from './simple.lock.getter.service';
import { SimpleLockService } from './simple.lock.service';

@Injectable()
export class SimpleLockTransactionService {
    constructor(
        private readonly simpleLockService: SimpleLockService,
        private readonly simpleLockGetter: SimpleLockGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly wrapService: WrapService,
        private readonly wrapTransaction: TransactionsWrapService,
        private readonly contextGetter: ContextGetterService,
        private readonly elrondProxy: ElrondProxyService,
    ) {}

    async lockTokens(
        inputTokens: InputTokenModel,
        lockEpochs: number,
        simpleLockAddress: string,
    ): Promise<TransactionModel> {
        const [contract, currentEpoch] = await Promise.all([
            this.elrondProxy.getSimpleLockSmartContract(simpleLockAddress),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const unlockEpoch = currentEpoch + lockEpochs;

        return contract.methodsExplicit
            .lockTokens([new U64Value(new BigNumber(unlockEpoch))])
            .withSingleESDTTransfer(
                TokenPayment.fungibleFromBigInteger(
                    inputTokens.tokenID,
                    new BigNumber(inputTokens.amount),
                ),
            )
            .withGasLimit(gasConfig.simpleLock.lockTokens)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unlockTokens(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel,
    ): Promise<TransactionModel> {
        await this.validateInputUnlockTokens(simpleLockAddress, inputTokens);

        const contract = await this.elrondProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );

        return contract.methodsExplicit
            .unlockTokens()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    inputTokens.tokenID,
                    inputTokens.nonce,
                    new BigNumber(inputTokens.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.simpleLock.unlockTokens)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async addLiquidityLockedTokenBatch(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel[],
        pairAddress: string,
        tolerance: number,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];
        const wrappedTokenID = await this.wrapService.getWrappedEgldTokenID();

        if (inputTokens.length !== 2) {
            throw new Error('Invalid input tokens length');
        }

        const [firstTokenInput, secondTokenInput] = inputTokens;

        switch (elrondConfig.EGLDIdentifier) {
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
        await this.validateInputAddLiquidityLockedToken(
            simpleLockAddress,
            inputTokens,
        );

        let [firstInputToken, secondInputToken] = inputTokens;

        const [pairFirstTokenID, pairSecondTokenID, contract] =
            await Promise.all([
                this.pairGetterService.getFirstTokenID(pairAddress),
                this.pairGetterService.getSecondTokenID(pairAddress),
                this.elrondProxy.getSimpleLockSmartContract(simpleLockAddress),
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

        const endpointArgs: TypedValue[] = [
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        return contract.methodsExplicit
            .addLiquidityLockedToken(endpointArgs)
            .withMultiESDTNFTTransfer(
                [
                    TokenPayment.metaEsdtFromBigInteger(
                        firstInputToken.tokenID,
                        firstInputToken.nonce,
                        new BigNumber(firstInputToken.amount),
                    ),
                    TokenPayment.metaEsdtFromBigInteger(
                        secondInputToken.tokenID,
                        secondInputToken.nonce,
                        new BigNumber(secondInputToken.amount),
                    ),
                ],
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.simpleLock.addLiquidityLockedToken)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async removeLiquidityLockedToken(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel,
        attributes: string,
        tolerance: number,
    ): Promise<TransactionModel[]> {
        await this.validateInputLpProxyToken(simpleLockAddress, inputTokens);

        const transactions = [];
        const contract = await this.elrondProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );

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

        const endpointArgs = [
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        transactions.push(
            contract.methodsExplicit
                .removeLiquidityLockedToken(endpointArgs)
                .withSingleESDTNFTTransfer(
                    TokenPayment.metaEsdtFromBigInteger(
                        inputTokens.tokenID,
                        inputTokens.nonce,
                        new BigNumber(inputTokens.amount),
                    ),
                    Address.fromString(sender),
                )
                .withGasLimit(gasConfig.simpleLock.removeLiquidityLockedToken)
                .withChainID(elrondConfig.chainID)
                .buildTransaction()
                .toPlainObject(),
        );

        return transactions;
    }

    async enterFarmLockedToken(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel[],
        farmAddress: string,
    ): Promise<TransactionModel> {
        let farmTypeDiscriminant: number;
        switch (farmType(farmAddress)) {
            case FarmRewardType.UNLOCKED_REWARDS:
                farmTypeDiscriminant = 0;
                break;
            case FarmRewardType.LOCKED_REWARDS:
                farmTypeDiscriminant = 1;
                break;
        }
        await this.validateInputEnterFarmProxyToken(
            simpleLockAddress,
            inputTokens,
            FarmTypeEnumType.getVariantByDiscriminant(farmTypeDiscriminant)
                .name,
        );

        const contract = await this.elrondProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );

        const gasLimit =
            inputTokens.length > 1
                ? gasConfig.simpleLock.enterFarmLockedToken.withTokenMerge
                : gasConfig.simpleLock.enterFarmLockedToken.default;
        const mappedPayments = inputTokens.map((inputToken) =>
            TokenPayment.metaEsdtFromBigInteger(
                inputToken.tokenID,
                inputToken.nonce,
                new BigNumber(inputToken.amount),
            ),
        );
        return contract.methodsExplicit
            .enterFarmLockedToken([
                EnumValue.fromDiscriminant(
                    FarmTypeEnumType,
                    farmTypeDiscriminant,
                ),
            ])
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async farmProxyTokenInteraction(
        simpleLockAddress: string,
        sender: string,
        inputTokens: InputTokenModel,
        endpointName: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        await this.validateInputFarmProxyToken(inputTokens, simpleLockAddress);

        const contract = await this.elrondProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );

        let interaction: Interaction;
        switch (endpointName) {
            case 'exitFarmLockedToken':
                interaction = contract.methodsExplicit.exitFarmLockedToken();
                break;
            case 'farmClaimRewardsLockedToken':
                interaction =
                    contract.methodsExplicit.farmClaimRewardsLockedToken();
                break;
            default:
                break;
        }

        return interaction
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    inputTokens.tokenID,
                    inputTokens.nonce,
                    new BigNumber(inputTokens.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async validateInputUnlockTokens(
        simpleLockAddress: string,
        inputTokens: InputTokenModel,
    ): Promise<void> {
        const lockedTokenID = await this.simpleLockGetter.getLockedTokenID(
            simpleLockAddress,
        );

        if (inputTokens.tokenID !== lockedTokenID || inputTokens.nonce < 1) {
            throw new Error('Invalid input token');
        }
    }

    private async validateInputAddLiquidityLockedToken(
        simpleLockAddress: string,
        inputTokens: InputTokenModel[],
    ): Promise<void> {
        const lockedTokenID = await this.simpleLockGetter.getLockedTokenID(
            simpleLockAddress,
        );

        if (inputTokens.length !== 2) {
            throw new Error('Invalid number of tokens');
        }

        const [firstToken, secondToken] = inputTokens;

        if (
            firstToken.tokenID !== lockedTokenID &&
            secondToken.tokenID !== lockedTokenID
        ) {
            throw new Error('Invalid tokens to send');
        }

        if (firstToken.tokenID === lockedTokenID && firstToken.nonce < 1) {
            throw new Error('Invalid locked token');
        }
        if (secondToken.tokenID === lockedTokenID && secondToken.nonce < 1) {
            throw new Error('Invalid locked token');
        }
    }

    private async validateInputLpProxyToken(
        simpleLockAddress: string,
        inputTokens: InputTokenModel,
    ): Promise<void> {
        const lockedLpTokenID = await this.simpleLockGetter.getLpProxyTokenID(
            simpleLockAddress,
        );

        if (inputTokens.tokenID !== lockedLpTokenID || inputTokens.nonce < 1) {
            throw new Error('Invalid input token');
        }
    }

    private async validateInputEnterFarmProxyToken(
        simpleLockAddress: string,
        inputTokens: InputTokenModel[],
        farmType: string,
    ): Promise<void> {
        const lpProxyToken = inputTokens[0];
        await this.validateInputLpProxyToken(simpleLockAddress, lpProxyToken);

        const decodeAttributesArgs: DecodeAttributesModel[] = [];
        for (const inputToken of inputTokens.slice(1)) {
            await this.validateInputFarmProxyToken(
                inputToken,
                simpleLockAddress,
            );
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
        const farmProxyTokenID =
            await this.simpleLockGetter.getFarmProxyTokenID(simpleLockAddress);

        if (inputTokens.tokenID !== farmProxyTokenID || inputTokens.nonce < 1) {
            throw new Error('Invalid input token');
        }
    }
}
