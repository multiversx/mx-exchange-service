import { Inject, Injectable } from '@nestjs/common';
import { Address, TokenTransfer } from '@multiversx/sdk-core';
import { constantsConfig, mxConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { BigNumber } from 'bignumber.js';
import { UnlockAssetsArgs } from '../models/locked-asset.args';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { LockedAssetGetterService } from './locked.asset.getter.service';

@Injectable()
export class TransactionsLockedAssetService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly lockedAssetGetter: LockedAssetGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async unlockAssets(
        sender: string,
        args: UnlockAssetsArgs,
    ): Promise<TransactionModel> {
        const contract =
            await this.mxProxy.getLockedAssetFactorySmartContract();
        return contract.methodsExplicit
            .unlockAssets()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.lockedTokenID,
                    args.lockedTokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.lockedAssetFactory.unlockAssets)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async lockAssets(token: InputTokenModel): Promise<TransactionModel> {
        await this.validateLockAssetsInputTokens(token);
        const contract =
            await this.mxProxy.getLockedAssetFactorySmartContract();
        return contract.methodsExplicit
            .lockAssets()
            .withSingleESDTTransfer(
                TokenTransfer.fungibleFromBigInteger(
                    token.tokenID,
                    new BigNumber(token.amount),
                ),
            )
            .withGasLimit(gasConfig.lockedAssetFactory.lockAssets)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async mergeLockedAssetTokens(
        sender: string,
        tokens: InputTokenModel[],
    ): Promise<TransactionModel> {
        if (
            new BigNumber(gasConfig.lockedAssetFactory.lockedAssetMerge)
                .times(tokens.length)
                .plus(gasConfig.lockedAssetFactory.defaultMergeLockedAssets)
                .isGreaterThan(constantsConfig.MAX_GAS_LIMIT)
        ) {
            throw new Error('Number of merge tokens exeeds maximum gas limit!');
        }
        try {
            await this.validateInputTokens(tokens);
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsLockedAssetService.name,
                this.mergeLockedAssetTokens.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract =
            await this.mxProxy.getLockedAssetFactorySmartContract();

        const mappedPayments = tokens.map((tokenPayment) =>
            TokenTransfer.metaEsdtFromBigInteger(
                tokenPayment.tokenID,
                tokenPayment.nonce,
                new BigNumber(tokenPayment.amount),
            ),
        );
        const gasLimit = new BigNumber(
            gasConfig.lockedAssetFactory.lockedAssetMerge,
        )
            .times(tokens.length)
            .plus(gasConfig.lockedAssetFactory.defaultMergeLockedAssets)
            .toNumber();

        return contract.methodsExplicit
            .mergeLockedAssetTokens()
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async validateInputTokens(tokens: InputTokenModel[]): Promise<void> {
        const lockedAssetTokenID =
            await this.lockedAssetGetter.getLockedTokenID();

        for (const lockedAssetToken of tokens) {
            if (
                lockedAssetToken.tokenID !== lockedAssetTokenID ||
                lockedAssetToken.nonce < 1
            ) {
                throw new Error('Invalid locked asset to merge!');
            }
        }
    }

    async validateLockAssetsInputTokens(token: InputTokenModel): Promise<void> {
        const assetTokenID = await this.lockedAssetGetter.getAssetTokenID();

        if (token.tokenID !== assetTokenID || token.nonce > 0) {
            throw new Error('Invalid input token!');
        }
    }
}
