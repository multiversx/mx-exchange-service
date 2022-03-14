import {
    BigUIntValue,
    BytesValue,
    GasLimit,
    Interaction,
    U32Value,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { MetabondingGetterService } from './metabonding.getter.service';

@Injectable()
export class MetabondingTransactionService {
    constructor(
        private readonly metabondingGetter: MetabondingGetterService,
        private readonly elrondProxy: ElrondProxyService,
        private readonly contextTransactions: ContextTransactionsService,
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

        let gasLimit: GasLimit;
        if (new BigNumber(userEntry.stakedAmount).isGreaterThan(0)) {
            gasLimit = new GasLimit(
                gasConfig.metabonding.stakeLockedAsset.withTokenMerge,
            );
        } else {
            gasLimit = new GasLimit(
                gasConfig.metabonding.stakeLockedAsset.default,
            );
        }

        const transactionArgs = [
            BytesValue.fromUTF8(inputToken.tokenID),
            new U32Value(inputToken.nonce),
            new BigUIntValue(new BigNumber(inputToken.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8(this.stakeLockedAsset.name),
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            gasLimit,
        );

        transaction.receiver = sender;

        return transaction;
    }

    async unstake(unstakeAmount: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction = contract.methods.unstake([
            new BigUIntValue(new BigNumber(unstakeAmount)),
        ]);
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.metabonding.unstake));

        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async unbond(): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction = contract.methods.unbond([]);
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.metabonding.unbond));

        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
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
