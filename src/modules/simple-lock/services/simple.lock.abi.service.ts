import { Interaction, QueryResponseBundle } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';

@Injectable()
export class SimpleLockAbiService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getGenericData(
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
                SimpleLockAbiService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getLockedTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getSimpleLockSmartContract();
        const interaction: Interaction = contract.methods.getLockedTokenId([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLpProxyTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getSimpleLockSmartContract();
        const interaction: Interaction = contract.methods.getLpProxyTokenId([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmProxyTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getSimpleLockSmartContract();
        const interaction: Interaction = contract.methods.getFarmProxyTokenId(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getKnownLiquidityPools(): Promise<string[]> {
        const contract = await this.elrondProxy.getSimpleLockSmartContract();
        const interaction: Interaction = contract.methods.getKnownLiquidityPools(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().map(pairAddress => {
            return pairAddress.valueOf().toString();
        });
    }

    async getKnownFarms(): Promise<string[]> {
        const contract = await this.elrondProxy.getSimpleLockSmartContract();
        const interaction: Interaction = contract.methods.getKnownFarms([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().map(farmAddress => {
            return farmAddress.valueOf().toString();
        });
    }
}
