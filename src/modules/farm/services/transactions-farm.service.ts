import { TransactionModel } from '../../../models/transaction.model';
import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    TypedValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Address, GasLimit, Interaction } from '@elrondnetwork/erdjs';
import { elrondConfig, gasConfig } from '../../../config';
import { BigNumber } from 'bignumber.js';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    FarmMigrationConfigArgs,
    SftFarmInteractionArgs,
} from '../models/farm.args';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { FarmGetterService } from './farm.getter.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { FarmRewardType, FarmVersion } from '../models/farm.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { farmType, farmVersion } from 'src/utils/farm.utils';

@Injectable()
export class TransactionsFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly contextTransactions: ContextTransactionsService,
        private readonly farmGetterService: FarmGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async enterFarm(
        sender: string,
        args: EnterFarmArgs,
    ): Promise<TransactionModel> {
        const whitelists = await this.farmGetterService.getWhitelist(
            args.farmAddress,
        );
        if (whitelists && whitelists.length > 0) {
            throw new Error(
                `whitelisted addresses only for farm ${args.farmAddress}`,
            );
        }

        try {
            await this.validateInputTokens(args.farmAddress, args.tokens);
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsFarmService.name,
                this.enterFarm.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const method =
            version === FarmVersion.V1_2
                ? args.lockRewards
                    ? 'enterFarmAndLockRewards'
                    : 'enterFarm'
                : 'enterFarm';
        const gasLimit =
            args.tokens.length > 1
                ? gasConfig.farms[version].enterFarm.withTokenMerge
                : gasConfig.farms[version].enterFarm.default;

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            args.tokens,
            method,
            [],
            new GasLimit(gasLimit),
        );
    }

    async exitFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        const whitelists = await this.farmGetterService.getWhitelist(
            args.farmAddress,
        );
        if (whitelists && whitelists.length > 0) {
            throw new Error(
                `whitelisted addresses only for farm ${args.farmAddress}`,
            );
        }
        const gasLimit = await this.getExitFarmGasLimit(args);
        return this.SftFarmInteraction(sender, args, 'exitFarm', gasLimit, []);
    }

    async claimRewards(
        sender: string,
        args: ClaimRewardsArgs,
    ): Promise<TransactionModel> {
        const whitelists = await this.farmGetterService.getWhitelist(
            args.farmAddress,
        );
        if (whitelists && whitelists.length > 0) {
            throw new Error(
                `whitelisted addresses only for farm ${args.farmAddress}`,
            );
        }
        const version = farmVersion(args.farmAddress);
        const type =
            version === FarmVersion.V1_2
                ? args.lockRewards
                    ? FarmRewardType.LOCKED_REWARDS
                    : FarmRewardType.UNLOCKED_REWARDS
                : farmType(args.farmAddress);

        const lockedAssetCreateGas =
            type === FarmRewardType.LOCKED_REWARDS
                ? gasConfig.lockedAssetCreate
                : 0;
        return this.SftFarmInteraction(
            sender,
            args,
            'claimRewards',
            gasConfig.farms[version][type].claimRewards + lockedAssetCreateGas,
            [],
        );
    }

    async compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        const whitelists = await this.farmGetterService.getWhitelist(
            args.farmAddress,
        );
        if (whitelists && whitelists.length > 0) {
            throw new Error(
                `whitelisted addresses only for farm ${args.farmAddress}`,
            );
        }

        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(args.farmAddress),
            this.farmGetterService.getFarmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID !== farmingTokenID) {
            throw new Error('failed to compound different tokens');
        }

        const version = farmVersion(args.farmAddress);

        return this.SftFarmInteraction(
            sender,
            args,
            'compoundRewards',
            gasConfig.farms[version].compoundRewards,
            [],
        );
    }

    async migrateToNewFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        const whitelists = await this.farmGetterService.getWhitelist(
            args.farmAddress,
        );
        if (whitelists && whitelists.length > 0) {
            throw new Error(
                `whitelisted addresses only for farm ${args.farmAddress}`,
            );
        }
        const version = farmVersion(args.farmAddress);
        return this.SftFarmInteraction(
            sender,
            args,
            'migrateToNewFarm',
            gasConfig.farms[version].migrateToNewFarm,
            [BytesValue.fromHex(Address.fromString(sender).hex())],
        );
    }

    async setFarmMigrationConfig(
        args: FarmMigrationConfigArgs,
    ): Promise<TransactionModel> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            args.oldFarmAddress,
        );

        const transactionArgs = [
            BytesValue.fromHex(new Address(args.oldFarmAddress).hex()),
            BytesValue.fromUTF8(args.oldFarmTokenID),
            BytesValue.fromHex(new Address(args.newFarmAddress).hex()),
            BytesValue.fromHex(new Address(args.newLockedFarmAddress).hex()),
        ];

        const interaction: Interaction = contract.methods.setFarmMigrationConfig(
            transactionArgs,
        );
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms.admin.setFarmMigrationConfig),
        );
        return transaction.toPlainObject();
    }

    async stopRewardsAndMigrateRps(
        farmAddress: string,
    ): Promise<TransactionModel> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.stopRewardsAndMigrateRps();
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms[version].stopRewards),
        );
        return transaction.toPlainObject();
    }

    async endProduceRewards(farmAddress: string): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.end_produce_rewards(
            [],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms.admin.end_produce_rewards),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async startProduceRewards(farmAddress: string): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.startProduceRewards(
            [],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms.admin.startProduceRewards),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setPerBlockRewardAmount(
        farmAddress: string,
        amount: string,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.setPerBlockRewardAmount(
            [],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms.admin.setPerBlockRewardAmount),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async set_penalty_percent(
        farmAddress: string,
        percent: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.set_penalty_percent([
            new BigUIntValue(new BigNumber(percent)),
        ]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms.admin.set_penalty_percent),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async set_minimum_farming_epochs(
        farmAddress: string,
        epochs: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.set_minimum_farming_epochs(
            [new BigUIntValue(new BigNumber(epochs))],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms.admin.set_minimum_farming_epochs),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async set_transfer_exec_gas_limit(
        farmAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.set_transfer_exec_gas_limit(
            [new BigUIntValue(new BigNumber(gasLimit))],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms.admin.set_transfer_exec_gas_limit),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async set_burn_gas_limit(
        farmAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.set_burn_gas_limit([
            new BigUIntValue(new BigNumber(gasLimit)),
        ]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms.admin.set_burn_gas_limit),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async pause(farmAddress: string): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.pause([]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(new GasLimit(gasConfig.farms.admin.pause));
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async resume(farmAddress: string): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.resume([]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(new GasLimit(gasConfig.farms.admin.resume));
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async registerFarmToken(
        farmAddress: string,
        tokenName: string,
        tokenTicker: string,
        decimals: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.registerFarmToken([
            BytesValue.fromUTF8(tokenName),
            BytesValue.fromUTF8(tokenTicker),
            new BigUIntValue(new BigNumber(decimals)),
        ]);
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms.admin.registerFarmToken),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async setLocalRolesFarmToken(
        farmAddress: string,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.setLocalRolesFarmToken(
            [],
        );
        const transaction = interaction.buildTransaction();
        // todo: test gas limit
        transaction.setGasLimit(
            new GasLimit(gasConfig.farms.admin.setLocalRolesFarmToken),
        );
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async mergeFarmTokens(
        sender: string,
        farmAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        // todo: test gas limit
        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            payments,
            this.mergeFarmTokens.name,
            [],
            new GasLimit(
                gasConfig.farms[version].mergeFarmTokensMultiplier *
                    payments.length,
            ),
        );
    }

    private async SftFarmInteraction(
        sender: string,
        args: SftFarmInteractionArgs,
        method: string,
        gasLimit: number,
        endpointArgs: TypedValue[],
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8(args.farmTokenID),
            new U32Value(args.farmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
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
        farmAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [farmTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmTokenID(farmAddress),
            this.farmGetterService.getFarmingTokenID(farmAddress),
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

    private async getExitFarmGasLimit(args: ExitFarmArgs): Promise<number> {
        const version = farmVersion(args.farmAddress);
        const type =
            version === FarmVersion.V1_2
                ? args.lockRewards
                    ? FarmRewardType.LOCKED_REWARDS
                    : FarmRewardType.UNLOCKED_REWARDS
                : farmType(args.farmAddress);
        const lockedAssetCreateGas =
            type === FarmRewardType.LOCKED_REWARDS
                ? gasConfig.lockedAssetCreate
                : 0;
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(args.farmAddress),
            this.farmGetterService.getFarmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID === farmingTokenID) {
            const gasLimit = args.withPenalty
                ? gasConfig.farms[version][type].exitFarm.withPenalty.localBurn
                : gasConfig.farms[version][type].exitFarm.default;
            return gasLimit + lockedAssetCreateGas;
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );

        if (pairAddress) {
            const trustedSwapPairs = await this.pairGetterService.getTrustedSwapPairs(
                pairAddress,
            );
            const gasLimit = args.withPenalty
                ? trustedSwapPairs.length > 0
                    ? gasConfig.farms[version][type].exitFarm.withPenalty
                          .buybackAndBurn
                    : gasConfig.farms[version][type].exitFarm.withPenalty
                          .pairBurn
                : gasConfig.farms[version][type].exitFarm.default;
            return gasLimit + lockedAssetCreateGas;
        }

        const gasLimit = args.withPenalty
            ? gasConfig.farms[version][type].exitFarm.withPenalty.localBurn
            : gasConfig.farms[version][type].exitFarm.default;
        return gasLimit + lockedAssetCreateGas;
    }
}
