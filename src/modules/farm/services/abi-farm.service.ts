import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    BytesValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Interaction, QueryResponseBundle } from '@elrondnetwork/erdjs';
import { BigNumber } from 'bignumber.js';
import { CalculateRewardsArgs } from '../models/farm.args';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { generateRunQueryLogMessage } from '../../../utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';
import {
    FarmMigrationConfig,
    FarmRewardType,
    FarmVersion,
} from '../models/farm.model';
import { ElrondGatewayService } from 'src/services/elrond-communication/elrond-gateway.service';

@Injectable()
export class AbiFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly gatewayService: ElrondGatewayService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getGenericData(
        contract: SmartContractProfiler,
        interaction: Interaction,
    ): Promise<QueryResponseBundle> {
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            return interaction.interpretQueryResponse(queryResponse);
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getRewardTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmingTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getWhitelist(farmAddress: string): Promise<string[]> {
        const [
            contract,
            version,
            type,
        ] = await this.elrondProxy.getFarmSmartContract(farmAddress);

        if (type !== FarmRewardType.CUSTOM_REWARDS) {
            return null;
        }

        const interaction: Interaction = contract.methods.getWhitelist([]);
        const response = await this.getGenericData(contract, interaction);

        return response.firstValue.valueOf().map(address => address.bech32());
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenSupply(
            [],
        );
        const response = await this.getGenericData(contract, interaction);

        return response.firstValue.valueOf().toFixed();
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        if (version !== FarmVersion.V1_2) {
            return null;
        }
        const interaction: Interaction = contract.methods.getFarmingTokenReserve(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getPerBlockRewardAmount(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getPenaltyPercent([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getMinimumFarmingEpoch(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardPerShare(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getRewardPerShare([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardReserve(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getRewardReserve([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getLastRewardBlockNonce(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getLastRewardBlockNonce(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        if (version !== FarmVersion.V1_2) {
            return null;
        }
        const interaction: Interaction = contract.methods.getUndistributedFees(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        if (version !== FarmVersion.V1_2) {
            return null;
        }
        const interaction: Interaction = contract.methods.getCurrentBlockFee(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        const currentBlockFee = response.firstValue.valueOf();
        return currentBlockFee ? currentBlockFee[1].toFixed() : '0';
    }

    async getLockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        if (version !== FarmVersion.V1_2) {
            return null;
        }
        const interaction: Interaction = contract.methods.getLockedRewardAprMuliplier(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().integerValue();
    }

    async getDivisionSafetyConstant(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getDivisionSafetyConstant(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const interaction: Interaction = contract.methods.calculateRewardsForGivenPosition(
            [
                new BigUIntValue(new BigNumber(args.liquidity)),
                BytesValue.fromHex(
                    Buffer.from(args.attributes, 'base64').toString('hex'),
                ),
            ],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
    }

    async getState(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getState([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().name;
    }

    async getProduceRewardsEnabled(farmAddress: string): Promise<boolean> {
        const response = await this.gatewayService.getSCStorageKey(
            farmAddress,
            'produce_rewards_enabled',
        );
        return response === '01';
    }

    async getFarmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig | undefined> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        try {
            const interaction: Interaction = contract.methods.getFarmMigrationConfiguration();
            const response = await this.getGenericData(contract, interaction);
            const decodedResponse = response.firstValue.valueOf();

            if (version === FarmVersion.V1_2) {
                return new FarmMigrationConfig({
                    migrationRole: decodedResponse.migration_role.name,
                    oldFarmAddress: decodedResponse.old_farm_address.bech32(),
                    oldFarmTokenID: decodedResponse.old_farm_token_id.toString(),
                    newFarmAddress: decodedResponse.new_farm_address.bech32(),
                    newLockedFarmAddress: decodedResponse.new_farm_with_lock_address.bech32(),
                });
            }

            return new FarmMigrationConfig({
                migrationRole: decodedResponse.migration_role.name,
                oldFarmAddress: decodedResponse.old_farm_address.bech32(),
                oldFarmTokenID: decodedResponse.old_farm_token_id.toString(),
            });
        } catch (error) {
            return undefined;
        }
    }

    async getBurnGasLimit(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getBurnGasLimit([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getTransferExecGasLimit(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getTransferExecGasLimit(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getPairContractManagedAddress(farmAddress: string): Promise<string> {
        try {
            const [contract] = await this.elrondProxy.getFarmSmartContract(
                farmAddress,
            );
            const interaction: Interaction = contract.methods.getPairContractManagedAddress(
                [],
            );
            const response = await this.getGenericData(contract, interaction);
            return response.firstValue.valueOf().bech32();
        } catch {
            return undefined;
        }
    }

    async getLockedAssetFactoryManagedAddress(
        farmAddress: string,
    ): Promise<string> {
        try {
            const [contract] = await this.elrondProxy.getFarmSmartContract(
                farmAddress,
            );
            const interaction: Interaction = contract.methods.getLockedAssetFactoryManagedAddress(
                [],
            );
            const response = await this.getGenericData(contract, interaction);
            return response.firstValue.valueOf().bech32();
        } catch {
            return undefined;
        }
    }

    async getLastErrorMessage(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getLastErrorMessage(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }
}
