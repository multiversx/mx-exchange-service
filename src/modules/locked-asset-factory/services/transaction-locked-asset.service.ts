import { Inject, Injectable } from '@nestjs/common';
import { Token, TokenTransfer } from '@multiversx/sdk-core';
import { constantsConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { BigNumber } from 'bignumber.js';
import { UnlockAssetsArgs } from '../models/locked-asset.args';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { LockedAssetGetterService } from './locked.asset.getter.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

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
        return this.mxProxy.getLockedAssetFactorySmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.lockedAssetFactory.unlockAssets,
                function: 'unlockAssets',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.lockedTokenID,
                            nonce: BigInt(args.lockedTokenNonce),
                        }),
                        amount: BigInt(args.amount),
                    }),
                ],
            }),
        );
    }

    async lockAssets(
        sender: string,
        token: InputTokenModel,
    ): Promise<TransactionModel> {
        await this.validateLockAssetsInputTokens(token);

        return this.mxProxy.getLockedAssetFactorySmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.lockedAssetFactory.lockAssets,
                function: 'lockAssets',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: token.tokenID,
                        }),
                        amount: BigInt(token.amount),
                    }),
                ],
            }),
        );
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

        const gasLimit = new BigNumber(
            gasConfig.lockedAssetFactory.lockedAssetMerge,
        )
            .times(tokens.length)
            .plus(gasConfig.lockedAssetFactory.defaultMergeLockedAssets)
            .toNumber();

        return this.mxProxy.getLockedAssetFactorySmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'mergeLockedAssetTokens',
                tokenTransfers: tokens.map(
                    (tokenPayment) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: tokenPayment.tokenID,
                                nonce: BigInt(tokenPayment.nonce),
                            }),
                            amount: BigInt(tokenPayment.amount),
                        }),
                ),
            }),
        );
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
