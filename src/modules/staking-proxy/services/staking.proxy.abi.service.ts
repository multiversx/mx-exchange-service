import { Interaction, QueryResponseBundle } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';

@Injectable()
export class AbiStakingProxyService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
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
                AbiStakingProxyService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getLpFarmAddress(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methods.getLpFarmAddress([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getStakingFarmAddress(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methods.getStakingFarmAddress(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getPairAddress(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methods.getPairAddress([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getStakingTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methods.getStakingTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getDualYieldTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methods.getDualYieldTokenId(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLpFarmTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methods.getLpFarmTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }
}
