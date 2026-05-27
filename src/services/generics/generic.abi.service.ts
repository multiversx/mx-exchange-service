import {
    ArgSerializer,
    Interaction,
    ReturnCode,
    SmartContractQuery,
    SmartContractQueryResponse,
    TypedOutcomeBundle,
    TypedValue,
} from '@multiversx/sdk-core';
import { PendingExecutor } from 'src/utils/pending.executor';
import { MXProxyService } from '../multiversx-communication/mx.proxy.service';

export class GenericAbiService {
    private queryExecutor: PendingExecutor<
        SmartContractQuery,
        SmartContractQueryResponse
    >;

    constructor(protected readonly mxProxy: MXProxyService) {
        this.queryExecutor = new PendingExecutor(
            async (query: SmartContractQuery) =>
                await this.mxProxy.getService().queryContract(query),
        );
    }

    async getGenericData(
        interaction: Interaction,
    ): Promise<TypedOutcomeBundle> {
        const query = this.buildQuery(interaction);
        const queryResponse = await this.queryExecutor.execute(query);
        return this.parseQueryResponse(queryResponse, interaction);
    }

    protected buildQuery(interaction: Interaction): SmartContractQuery {
        const argSerializer = new ArgSerializer();
        const encodedArgs = argSerializer
            .valuesToBuffers(interaction.getArguments())
            .map((buffer) => Uint8Array.from(buffer));

        return new SmartContractQuery({
            contract: interaction.getContractAddress(),
            function: interaction.getFunction().toString(),
            arguments: encodedArgs,
        });
    }

    protected async runQuery(
        interaction: Interaction,
    ): Promise<SmartContractQueryResponse> {
        return this.queryExecutor.execute(this.buildQuery(interaction));
    }

    protected parseQueryResponse(
        queryResponse: SmartContractQueryResponse,
        interaction: Interaction,
    ): TypedOutcomeBundle {
        const argSerializer = new ArgSerializer();
        const endpoint = interaction.getEndpoint();
        const returnCode = new ReturnCode(queryResponse.returnCode);
        const values: TypedValue[] = argSerializer.buffersToValues(
            queryResponse.returnDataParts.map((part) => Buffer.from(part)),
            endpoint.output,
        );

        return {
            returnCode,
            returnMessage: queryResponse.returnMessage,
            values,
            firstValue: values[0],
            secondValue: values[1],
            thirdValue: values[2],
            lastValue: values[values.length - 1],
        };
    }
}
