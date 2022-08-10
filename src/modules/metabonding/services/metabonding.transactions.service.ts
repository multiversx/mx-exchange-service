import { Address, BigUIntValue, TokenPayment } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { ElrondProxyService } from 'src/services/elrond-communication/services/elrond-proxy.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { MetabondingGetterService } from './metabonding.getter.service';

@Injectable()
export class MetabondingTransactionService {
    constructor(
        private readonly metabondingGetter: MetabondingGetterService,
        private readonly elrondProxy: ElrondProxyService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async stakeLockedAsset(
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        try {
            await this.validateInputToken(inputToken);
        } catch (error) {
            const logMessage = generateLogMessage(
                MetabondingTransactionService.name,
                this.stakeLockedAsset.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const [contract, userEntry] = await Promise.all([
            this.elrondProxy.getMetabondingStakingSmartContract(),
            this.metabondingGetter.getUserEntry(sender),
        ]);

        const gasLimit =
            userEntry.tokenNonce > 0
                ? gasConfig.metabonding.stakeLockedAsset.withTokenMerge
                : gasConfig.metabonding.stakeLockedAsset.default;

        return contract.methodsExplicit
            .stakeLockedAsset()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unstake(unstakeAmount: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getMetabondingStakingSmartContract();
        return contract.methodsExplicit
            .unstake([new BigUIntValue(new BigNumber(unstakeAmount))])
            .withGasLimit(gasConfig.metabonding.unstake)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unbond(sender: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getMetabondingStakingSmartContract();
        await this.pubSub.publish('deleteCacheKeys', [`${sender}.userEntry`]);
        return contract.methodsExplicit
            .unbond([])
            .withGasLimit(gasConfig.metabonding.unbond)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async validateInputToken(
        inputToken: InputTokenModel,
    ): Promise<void> {
        const lockedAssetTokenID = await this.metabondingGetter.getLockedAssetTokenID();

        if (
            lockedAssetTokenID !== inputToken.tokenID ||
            inputToken.nonce === 0
        ) {
            throw new Error('invalid input tokens');
        }
    }
}
