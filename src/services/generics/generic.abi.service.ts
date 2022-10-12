import { ContractQueryResponse } from '@elrondnetwork/erdjs-network-providers/out';
import { Interaction, Query, ResultsParser, TypedOutcomeBundle } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { PendingExecutor } from 'src/utils/pending.executor';
import { Logger } from 'winston';
import { ElrondProxyService } from '../elrond-communication/elrond-proxy.service';
import { ReturnCode } from '@elrondnetwork/erdjs/out/smartcontracts/returnCode';

@Injectable()
export class GenericAbiService {
    private queryExecutor: PendingExecutor<Query, ContractQueryResponse>;

    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        this.queryExecutor = new PendingExecutor(
            async (query: Query) =>
                await this.elrondProxy.getService().queryContract(query),
        );
    }

    async getGenericData(
        interaction: Interaction,
    ): Promise<TypedOutcomeBundle> {
        try {
            const query = interaction.check().buildQuery();
            const queryResponse = await this.queryExecutor.execute(query);
            const endpointDefinition = interaction.getEndpoint();
            if (queryResponse.returnCode === "user error"
                && queryResponse.returnMessage === "storage decode error: input too short") {
                return {
                    returnCode: ReturnCode.UserError,
                    returnMessage: queryResponse.returnMessage,
                    firstValue: undefined,
                    lastValue: undefined,
                    secondValue: undefined,
                    thirdValue: undefined,
                    values: []
                }
            }
            return new ResultsParser().parseQueryResponse(
                queryResponse,
                endpointDefinition,
            );
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                this.constructor.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
