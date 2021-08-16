import { Interaction } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { generateRunQueryLogMessage } from '../../utils/generate-log-message';
import { Logger } from 'winston';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { PairMetadata } from './models/pair.metadata.model';

@Injectable()
export class AbiRouterService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getAllPairsAddress(): Promise<string[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methods.getAllPairsAddresses(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const result = interaction.interpretQueryResponse(queryResponse);

            const pairsAddress = result.firstValue
                .valueOf()
                .map(pairAddress => {
                    return pairAddress.toString();
                });

            return pairsAddress;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiRouterService.name,
                this.getAllPairsAddress.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const getAllPairsInteraction: Interaction = contract.methods.getAllPairContractMetadata(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                getAllPairsInteraction.buildQuery(),
            );
            const result = getAllPairsInteraction.interpretQueryResponse(
                queryResponse,
            );

            const pairsMetadata = result.firstValue.valueOf().map(v => {
                return new PairMetadata({
                    firstTokenID: v.first_token_id.toString(),
                    secondTokenID: v.second_token_id.toString(),
                    address: v.address.toString(),
                });
            });

            return pairsMetadata;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiRouterService.name,
                this.getPairsMetadata.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
