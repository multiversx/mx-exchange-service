import { Interaction, QueryResponseBundle } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { generateRunQueryLogMessage } from '../../utils/generate-log-message';
import { Logger } from 'winston';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { PairMetadata } from './models/pair.metadata.model';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';

@Injectable()
export class AbiRouterService {
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
                AbiRouterService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getAllPairsAddress(): Promise<string[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methods.getAllPairsManagedAddresses(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().map(pairAddress => {
            return pairAddress.toString();
        });
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methods.getAllPairContractMetadata(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().map(v => {
            return new PairMetadata({
                firstTokenID: v.first_token_id.toString(),
                secondTokenID: v.second_token_id.toString(),
                address: v.address.toString(),
            });
        });
    }
}
