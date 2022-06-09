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

        const gasLimit =
            payments.length > 1
                ? gasConfig.stake.stakeFarm.withTokenMerge
                : gasConfig.stake.stakeFarm.default;
        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            payments,
            this.stakeFarm.name,
            [],
            new GasLimit(gasLimit),
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

    async stakeFarmThroughProxy(
        farmStakeAddress: string,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8('stakeFarmThroughProxy'),
            new BigUIntValue(new BigNumber(amount)),
        ];

        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.stakeFarmThroughProxy),
        );
    }

    async unstakeFarmThroughProxy(
        farmStakeAddress: string,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8('unstakeFarmThroughProxy'),
            new BigUIntValue(new BigNumber(amount)),
        ];

        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.unstakeFarmThroughProxy),
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

    async topUpRewards(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        // todo: test gas limit
        return await this.SftInteraction(
            sender,
            stakeAddress,
            payment,
            this.topUpRewards.name,
            gasConfig.stake.admin.topUpRewards,
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

    async setPenaltyPercent(
        farmStakeAddress: string,
        percent: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('set_penalty_percent'),
            new BigUIntValue(new BigNumber(percent)),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.set_penalty_percent),
        );
    }

    async setMinimumFarmingEpochs(
        farmStakeAddress: string,
        epochs: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('set_minimum_farming_epochs'),
            new BigUIntValue(new BigNumber(epochs)),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.set_minimum_farming_epochs),
        );
    }

    async setBurnGasLimit(
        farmStakeAddress: string,
        gasLimit: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('set_burn_gas_limit'),
            new BigUIntValue(new BigNumber(gasLimit)),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.set_burn_gas_limit),
        );
    }

    async setTransferExecGasLimit(
        farmStakeAddress: string,
        gasLimit: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('set_transfer_exec_gas_limit'),
            new BigUIntValue(new BigNumber(gasLimit)),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.set_transfer_exec_gas_limit),
        );
    }

    async addAddressToWhitelist(
        farmStakeAddress: string,
        address: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('addAddressToWhitelist'),
            BytesValue.fromHex(new Address(address).hex()),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.addAddressToWhitelist),
        );
    }

    async removeAddressFromWhitelist(
        farmStakeAddress: string,
        address: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('removeAddressFromWhitelist'),
            BytesValue.fromHex(new Address(address).hex()),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.removeAddressFromWhitelist),
        );
    }

    async pause(farmStakeAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [BytesValue.fromUTF8('pause')];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.pause),
        );
    }

    async resume(farmStakeAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [BytesValue.fromUTF8('resume')];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.resume),
        );
    }

    async setLocalRolesFarmToken(
        farmStakeAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [BytesValue.fromUTF8('setLocalRolesFarmToken')];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.setLocalRolesFarmToken),
        );
    }

    async registerFarmToken(
        farmStakeAddress: string,
        tokenName: string,
        tokenID: string,
        decimals: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('registerFarmToken'),
            BytesValue.fromUTF8(tokenName),
            BytesValue.fromUTF8(tokenID),
            new BigUIntValue(new BigNumber(decimals)),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.registerFarmToken),
        );
    }

    async setPerBlockRewardAmount(
        farmStakeAddress: string,
        perBlockAmount: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setPerBlockRewardAmount'),
            new BigUIntValue(new BigNumber(perBlockAmount)),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.setPerBlockRewardAmount),
        );
    }

    async setMaxApr(
        farmStakeAddress: string,
        maxApr: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setMaxApr'),
            new BigUIntValue(new BigNumber(maxApr)),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.setMaxApr),
        );
    }

    async setMinUnbondEpochs(
        farmStakeAddress: string,
        minUnboundEpoch: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setMinUnbondEpochs'),
            new BigUIntValue(new BigNumber(minUnboundEpoch)),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.setMinUnbondEpochs),
        );
    }

    async startProduceRewards(
        farmStakeAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [BytesValue.fromUTF8('startProduceRewards')];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.startProduceRewards),
        );
    }

    async endProduceRewards(
        farmStakeAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const transactionArgs = [BytesValue.fromUTF8('end_produce_rewards')];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.end_produce_rewards),
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
