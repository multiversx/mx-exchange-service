import {
    Address,
    BigUIntValue,
    BytesValue,
    EnumValue,
    GasLimit,
    TypedValue,
    U32Value,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig, scAddress } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { NftToken } from 'src/models/tokens/nftToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { FarmRewardType } from 'src/modules/farm/models/farm.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { DecodeAttributesModel } from 'src/modules/proxy/models/proxy.args';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { farmType } from 'src/utils/farm.utils';
import { tokenIdentifier } from 'src/utils/token.converters';
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
        private readonly contextTransactions: ContextTransactionsService,
        private readonly contextGetter: ContextGetterService,
        private readonly elrondProxy: ElrondProxyService,
        private readonly apiService: ElrondApiService,
    ) {}

    async unlockTokens(
        sender: string,
        inputTokens: InputTokenModel,
    ): Promise<TransactionModel> {
        await this.validateInputUnlockTokens(inputTokens);

        const contract = await this.elrondProxy.getSimpleLockSmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(inputTokens.tokenID),
            new U32Value(inputTokens.nonce),
            new BigUIntValue(new BigNumber(inputTokens.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('unlockTokens'),
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.simpleLock.unlockTokens),
        );

        transaction.receiver = sender;

        return transaction;
    }

    async addLiquidityLockedTokenBatch(
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
                sender,
                [firstTokenInput, secondTokenInput],
                pairAddress,
                tolerance,
            ),
        );
        return transactions;
    }

    async addLiquidityLockedToken(
        sender: string,
        inputTokens: InputTokenModel[],
        pairAddress: string,
        tolerance: number,
    ): Promise<TransactionModel> {
        await this.validateInputAddLiquidityLockedToken(inputTokens);

        let [firstInputToken, secondInputToken] = inputTokens;

        const [
            pairFirstTokenID,
            pairSecondTokenID,
            contract,
        ] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
            this.elrondProxy.getSimpleLockSmartContract(),
        ]);

        let [firstTokenID, secondTokenID] = [
            firstInputToken.tokenID,
            secondInputToken.tokenID,
        ];
        if (firstInputToken.attributes) {
            const decodedAttributes = this.simpleLockService.decodeLockedTokenAttributes(
                {
                    identifier: firstInputToken.tokenID,
                    attributes: firstInputToken.attributes,
                },
            );
            firstTokenID = decodedAttributes.originalTokenID;
        }
        if (secondInputToken.attributes) {
            const decodedAttributes = this.simpleLockService.decodeLockedTokenAttributes(
                {
                    identifier: secondInputToken.tokenID,
                    attributes: secondInputToken.attributes,
                },
            );
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

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            [firstInputToken, secondInputToken],
            this.addLiquidityLockedToken.name,
            endpointArgs,
            new GasLimit(gasConfig.simpleLock.addLiquidityLockedToken),
        );
    }

    async removeLiquidityLockedToken(
        sender: string,
        inputTokens: InputTokenModel,
        attributes: string,
        tolerance: number,
    ): Promise<TransactionModel[]> {
        await this.validateInputLpProxyToken(inputTokens);

        const transactions = [];
        const [
            wrappedTokenID,
            lockedTokenID,
            contract,
            currentEpoch,
        ] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.simpleLockGetter.getLockedTokenID(),
            this.elrondProxy.getSimpleLockSmartContract(),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const lpProxyTokenAttributes = this.simpleLockService.decodeLpProxyTokenAttributes(
            {
                attributes: attributes,
                identifier: inputTokens.tokenID,
            },
        );

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

        const transactionArgs = [
            BytesValue.fromUTF8(inputTokens.tokenID),
            new U32Value(inputTokens.nonce),
            new BigUIntValue(new BigNumber(inputTokens.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8(this.removeLiquidityLockedToken.name),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.simpleLock.removeLiquidityLockedToken),
        );
        transaction.receiver = sender;
        transactions.push(transaction);

        let lockedWrappedToken: NftToken = undefined;
        let unwrapAmount: string;
        switch (wrappedTokenID) {
            case lpProxyTokenAttributes.firstTokenID:
                if (lpProxyTokenAttributes.firstTokenLockedNonce > 0) {
                    unwrapAmount = amount0Min.toFixed();
                    lockedWrappedToken = await this.apiService.getNftByTokenIdentifier(
                        scAddress.simpleLockAddress,
                        tokenIdentifier(
                            lockedTokenID,
                            lpProxyTokenAttributes.firstTokenLockedNonce,
                        ),
                    );
                } else {
                    transactions.push(
                        await this.wrapTransaction.unwrapEgld(
                            sender,
                            amount0Min.toFixed(),
                        ),
                    );
                }
                break;
            case lpProxyTokenAttributes.secondTokenID:
                if (lpProxyTokenAttributes.secondTokenLockedNonce > 0) {
                    unwrapAmount = amount1Min.toFixed();
                    lockedWrappedToken = await this.apiService.getNftByTokenIdentifier(
                        scAddress.simpleLockAddress,
                        tokenIdentifier(
                            lockedTokenID,
                            lpProxyTokenAttributes.secondTokenLockedNonce,
                        ),
                    );
                } else {
                    transactions.push(
                        await this.wrapTransaction.unwrapEgld(
                            sender,
                            amount1Min.toFixed(),
                        ),
                    );
                }
                break;
        }

        if (lockedWrappedToken) {
            const lockedWrappedTokenAttributes = this.simpleLockService.decodeLockedTokenAttributes(
                {
                    identifier: lockedWrappedToken.identifier,
                    attributes: lockedWrappedToken.attributes,
                },
            );
            if (currentEpoch >= lockedWrappedTokenAttributes.unlockEpoch) {
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(sender, unwrapAmount),
                );
            }
        }

        return transactions;
    }

    async enterFarmLockedToken(
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
            inputTokens,
            FarmTypeEnumType.getVariantByDiscriminant(farmTypeDiscriminant)
                .name,
        );

        const contract = await this.elrondProxy.getSimpleLockSmartContract();

        const gasLimit =
            inputTokens.length > 1
                ? gasConfig.simpleLock.enterFarmLockedToken.withTokenMerge
                : gasConfig.simpleLock.enterFarmLockedToken.default;

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            inputTokens,
            this.enterFarmLockedToken.name,
            [
                EnumValue.fromDiscriminant(
                    FarmTypeEnumType,
                    farmTypeDiscriminant,
                ),
            ],
            new GasLimit(gasLimit),
        );
    }

    async farmProxyTokenInteraction(
        sender: string,
        inputTokens: InputTokenModel,
        endpointName: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        await this.validateInputFarmProxyToken(inputTokens);

        const contract = await this.elrondProxy.getSimpleLockSmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(inputTokens.tokenID),
            new U32Value(inputTokens.nonce),
            new BigUIntValue(new BigNumber(inputTokens.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8(endpointName),
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasLimit),
        );
        transaction.receiver = sender;
        return transaction;
    }

    private async validateInputUnlockTokens(
        inputTokens: InputTokenModel,
    ): Promise<void> {
        const lockedTokenID = await this.simpleLockGetter.getLockedTokenID();

        if (inputTokens.tokenID !== lockedTokenID || inputTokens.nonce < 1) {
            throw new Error('Invalid input token');
        }
    }

    private async validateInputAddLiquidityLockedToken(
        inputTokens: InputTokenModel[],
    ): Promise<void> {
        const lockedTokenID = await this.simpleLockGetter.getLockedTokenID();

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
        inputTokens: InputTokenModel,
    ): Promise<void> {
        const lockedLpTokenID = await this.simpleLockGetter.getLpProxyTokenID();

        if (inputTokens.tokenID !== lockedLpTokenID || inputTokens.nonce < 1) {
            throw new Error('Invalid input token');
        }
    }

    private async validateInputEnterFarmProxyToken(
        inputTokens: InputTokenModel[],
        farmType: string,
    ): Promise<void> {
        const lpProxyToken = inputTokens[0];
        await this.validateInputLpProxyToken(lpProxyToken);

        const decodeAttributesArgs: DecodeAttributesModel[] = [];
        for (const inputToken of inputTokens.slice(1)) {
            await this.validateInputFarmProxyToken(inputToken);
            decodeAttributesArgs.push({
                attributes: inputToken.attributes,
                identifier: inputToken.tokenID,
            });
        }

        const lpProxyTokenAttributes = this.simpleLockService.decodeLpProxyTokenAttributes(
            {
                attributes: lpProxyToken.attributes,
                identifier: lpProxyToken.tokenID,
            },
        );
        const decodedAttributesBatch = await this.simpleLockService.decodeBatchFarmProxyTokenAttributes(
            {
                batchAttributes: decodeAttributesArgs,
            },
        );

        for (const decodedAttributes of decodedAttributesBatch) {
            const sameFarmingToken =
                decodedAttributes.farmingTokenID ===
                lpProxyTokenAttributes.lpTokenID;
            const sameFarmingTokenNonce =
                decodedAttributes.farmingTokenLockedNonce ===
                lpProxyToken.nonce;
            const sameFarmType = decodedAttributes.farmType === farmType;
            console.log({
                sameFarmingToken,
                sameFarmingTokenNonce,
                sameFarmType,
                farmingToken: decodedAttributes.farmingTokenID,
                lpTokenID: lpProxyTokenAttributes.lpTokenID,
            });
            if (!(sameFarmingToken && sameFarmingTokenNonce && sameFarmType)) {
                throw new Error('Invalid farm proxy token');
            }
        }
    }

    private async validateInputFarmProxyToken(
        inputTokens: InputTokenModel,
    ): Promise<void> {
        const farmProxyTokenID = await this.simpleLockGetter.getFarmProxyTokenID();

        if (inputTokens.tokenID !== farmProxyTokenID || inputTokens.nonce < 1) {
            throw new Error('Invalid input token');
        }
    }
}
