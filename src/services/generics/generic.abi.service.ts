import {
    Interaction,
    ResultsParser,
    TypedOutcomeBundle,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { ElrondProxyService } from '../elrond-communication/elrond-proxy.service';

@Injectable()
export class GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    async getGenericData(
        serviceName: string,
        interaction: Interaction,
    ): Promise<TypedOutcomeBundle> {
        try {
            const query = interaction.check().buildQuery();
            const queryResponse = await this.elrondProxy
                .getService()
                .queryContract(query);
            const endpointDefinition = interaction.getEndpoint();
            return new ResultsParser().parseQueryResponse(
                queryResponse,
                endpointDefinition,
            );
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                serviceName,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
