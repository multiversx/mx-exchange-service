import {
    Address,
    BigUIntValue,
    BytesValue,
    GasLimit,
    TypedValue,
    U32Value,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { TransactionsFarmService } from 'src/modules/farm/services/transactions-farm.service';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { StakingGetterService } from './staking.getter.service';

@Injectable()
export class StakingTransactionService {
    constructor(
        private readonly stakeGetterService: StakingGetterService,
        private readonly contextTransactions: ContextTransactionsService,
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async stakeFarm(
        sender: string,
        stakeAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        try {
            await this.validateInputTokens(stakeAddress, payments);
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsFarmService.name,
                this.stakeFarm.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        console.log({
            gasLimit: gasConfig.stake.stakeFarm,
        });
        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            payments,
            this.stakeFarm.name,
            [],
            new GasLimit(gasConfig.stake.stakeFarm),
        );
    }

    async unstakeFarm(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        return await this.SftInteraction(
            sender,
            stakeAddress,
            payment,
            this.unstakeFarm.name,
            gasConfig.stake.unstakeFarm,
            [],
        );
    }

    async unbondFarm(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        return await this.SftInteraction(
            sender,
            stakeAddress,
            payment,
            this.unbondFarm.name,
            gasConfig.stake.unboundFarm,
            [],
        );
    }

    async claimRewards(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        return await this.SftInteraction(
            sender,
            stakeAddress,
            payment,
            this.claimRewards.name,
            gasConfig.stake.claimRewards,
            [],
        );
    }

    async claimRewardsWithNewValue(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
        newValue: string,
    ): Promise<TransactionModel> {
        return await this.SftInteraction(
            sender,
            stakeAddress,
            payment,
            this.claimRewardsWithNewValue.name,
            gasConfig.stake.claimRewardsWithNewValue,
            [new BigUIntValue(new BigNumber(newValue))],
        );
    }

    async compoundRewards(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        return await this.SftInteraction(
            sender,
            stakeAddress,
            payment,
            this.compoundRewards.name,
            gasConfig.stake.compoundRewards,
            [],
        );
    }

    async mergeFarmTokens(
        sender: string,
        stakeAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            payments,
            this.mergeFarmTokens.name,
            [],
            new GasLimit(gasConfig.stake.mergeTokens),
        );
    }

    private async SftInteraction(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
        method: string,
        gasLimit: number,
        endpointArgs: TypedValue[],
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8(payment.tokenID),
            new U32Value(payment.nonce),
            new BigUIntValue(new BigNumber(payment.amount)),
            BytesValue.fromHex(new Address(stakeAddress).hex()),
            BytesValue.fromUTF8(method),
            ...endpointArgs,
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasLimit),
        );

        transaction.receiver = sender;

        return transaction;
    }

    private async validateInputTokens(
        stakeAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [farmTokenID, farmingTokenID] = await Promise.all([
            this.stakeGetterService.getFarmTokenID(stakeAddress),
            this.stakeGetterService.getFarmingTokenID(stakeAddress),
        ]);

        if (tokens[0].tokenID !== farmingTokenID || tokens[0].nonce > 0) {
            throw new Error('invalid farming token provided');
        }

        for (const inputToken of tokens.slice(1)) {
            if (inputToken.tokenID !== farmTokenID || inputToken.nonce === 0) {
                throw new Error('invalid farm token provided');
            }
        }
    }
}
