import { ContractQueryResponse } from '@multiversx/sdk-network-providers/out';
import {
    Interaction,
    Query,
    ResultsParser,
    TypedOutcomeBundle,
} from '@multiversx/sdk-core';
import { PendingExecutor } from 'src/utils/pending.executor';
import { MXProxyService } from '../multiversx-communication/mx.proxy.service';

export class GenericAbiService {
    private queryExecutor: PendingExecutor<Query, ContractQueryResponse>;

    constructor(protected readonly mxProxy: MXProxyService) {
        this.queryExecutor = new PendingExecutor(
            async (query: Query) =>
                await this.mxProxy.getService().queryContract(query),
        );
    }

    async getGenericData(
        interaction: Interaction,
    ): Promise<TypedOutcomeBundle> {
        const query = interaction.check().buildQuery();
        const queryResponse = await this.queryExecutor.execute(query);
        const endpointDefinition = interaction.getEndpoint();
        return new ResultsParser().parseQueryResponse(
            queryResponse,
            endpointDefinition,
        );
    }
}
