import {
    Address,
    BigUIntValue,
    BytesValue,
    Interaction,
    QueryResponseBundle,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';
import { ElrondGatewayService } from 'src/services/elrond-communication/elrond-gateway.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';

@Injectable()
export class AbiStakingService {
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
                AbiStakingService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getPairContractManagedAddress(stakeAddress: string): Promise<string> {
        try {
            const contract = await this.elrondProxy.getStakingSmartContract(
                stakeAddress,
            );
            const interaction: Interaction = contract.methods.getPairContractManagedAddress(
                [],
            );
            const response = await this.getGenericData(contract, interaction);
            return response.firstValue.valueOf().hex32();
        } catch {
            return undefined;
        }
    }

    async getFarmTokenID(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmingTokenID(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getFarmingTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getRewardTokenID(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getRewardTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenSupply(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenSupply(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardPerShare(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getRewardPerShare([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getAccumulatedRewards(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getAccumulatedRewards(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardCapacity(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getRewardCapacity([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getAnnualPercentageRewards(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getAnnualPercentageRewards(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getMinUnbondEpochs(stakeAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getMinUnbondEpochs(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getPenaltyPercent(stakeAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getPenaltyPercent([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getMinimumFarmingEpoch(stakeAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getMinimumFarmingEpoch(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getPerBlockRewardAmount(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getPerBlockRewardAmount(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getLastRewardBlockNonce(stakeAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getLastRewardBlockNonce(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getDivisionSafetyConstant(stakeAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getDivisionSafetyConstant(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getProduceRewardsEnabled(farmAddress: string): Promise<boolean> {
        const response = await this.gatewayService.getSCStorageKey(
            farmAddress,
            'produce_rewards_enabled',
        );
        return response === '01';
    }

    async getBurnGasLimit(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getBurnGasLimit([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
    }

    async getTransferExecGasLimit(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getTransferExecGasLimit(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
    }

    async getState(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getState([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().name;
    }

    async calculateRewardsForGivenPosition(
        stakeAddress: string,
        amount: string,
        attributes: string,
    ): Promise<BigNumber> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.calculateRewardsForGivenPosition(
            [
                new BigUIntValue(new BigNumber(amount)),
                BytesValue.fromHex(
                    Buffer.from(attributes, 'base64').toString('hex'),
                ),
            ],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
    }

    async getLockedAssetFactoryManagedAddress(
        stakeAddress: string,
    ): Promise<string> {
        try {
            const contract = await this.elrondProxy.getStakingSmartContract(
                stakeAddress,
            );
            const interaction: Interaction = contract.methods.getLockedAssetFactoryManagedAddress(
                [],
            );
            const response = await this.getGenericData(contract, interaction);
            return response.firstValue.valueOf().hex32();
        } catch {
            return undefined;
        }
    }

    async isWhitelisted(
        stakeAddress: string,
        address: string,
    ): Promise<boolean> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.isWhitelisted([
            BytesValue.fromHex(new Address(address).hex()),
        ]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
    }

    async getLastErrorMessage(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methods.getLastErrorMessage(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }
}
