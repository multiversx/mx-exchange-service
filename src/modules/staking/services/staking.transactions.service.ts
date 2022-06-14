import {
    Address,
    BigUIntValue,
    BytesValue,
    GasLimit,
    Interaction,
    TypedValue,
    U32Value,
    U64Value,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig, gasConfig } from 'src/config';
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
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8(payment.tokenID),
            new BigUIntValue(new BigNumber(payment.amount)),
            BytesValue.fromUTF8(this.topUpRewards.name),
        ];
        // todo: test gas limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stake.admin.topUpRewards),
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
        const interaction: Interaction = contract.methods.set_penalty_percent([
            new BigUIntValue(new BigNumber(percent)),
        ]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.set_penalty_percent),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setMinimumFarmingEpochs(
        farmStakeAddress: string,
        epochs: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.set_minimum_farming_epochs(
            [new BigUIntValue(new BigNumber(epochs))],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.set_minimum_farming_epochs),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setBurnGasLimit(
        farmStakeAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.set_burn_gas_limit([
            new BigUIntValue(new BigNumber(gasLimit)),
        ]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.set_burn_gas_limit),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setTransferExecGasLimit(
        farmStakeAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.set_transfer_exec_gas_limit(
            [new BigUIntValue(new BigNumber(gasLimit))],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.set_transfer_exec_gas_limit),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async addAddressToWhitelist(
        farmStakeAddress: string,
        address: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.addAddressToWhitelist(
            [BytesValue.fromHex(new Address(address).hex())],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.addAddressToWhitelist),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async removeAddressFromWhitelist(
        farmStakeAddress: string,
        address: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.removeAddressFromWhitelist(
            [BytesValue.fromHex(new Address(address).hex())],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.removeAddressFromWhitelist),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async pause(farmStakeAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.pause([]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(new GasLimit(gasConfig.stake.admin.pause));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async resume(farmStakeAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.resume([]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(new GasLimit(gasConfig.stake.admin.resume));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setLocalRolesFarmToken(
        farmStakeAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.setLocalRolesFarmToken(
            [],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.setLocalRolesFarmToken),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async registerFarmToken(
        farmStakeAddress: string,
        tokenName: string,
        tokenTicker: string,
        decimals: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.registerFarmToken([
            BytesValue.fromUTF8(tokenName),
            BytesValue.fromUTF8(tokenTicker),
            new U64Value(new BigNumber(decimals)),
        ]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.registerFarmToken),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setPerBlockRewardAmount(
        farmStakeAddress: string,
        perBlockAmount: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.setPerBlockRewardAmount(
            [new BigUIntValue(new BigNumber(perBlockAmount))],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.setPerBlockRewardAmount),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setMaxApr(
        farmStakeAddress: string,
        maxApr: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.setMaxApr([
            new BigUIntValue(new BigNumber(maxApr)),
        ]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(new GasLimit(gasConfig.stake.admin.setMaxApr));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setMinUnbondEpochs(
        farmStakeAddress: string,
        minUnboundEpoch: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.setMinUnbondEpochs([
            new U64Value(new BigNumber(minUnboundEpoch)),
        ]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.setMinUnbondEpochs),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async startProduceRewards(
        farmStakeAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.start_produce_rewards(
            [],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.startProduceRewards),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async endProduceRewards(
        farmStakeAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            farmStakeAddress,
        );
        const interaction: Interaction = contract.methods.end_produce_rewards(
            [],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.stake.admin.end_produce_rewards),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
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
