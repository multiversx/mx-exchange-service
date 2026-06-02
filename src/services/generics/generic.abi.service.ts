import {
    AbiRegistry,
    Address,
    ArgSerializer,
    EndpointDefinition,
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
        abi: AbiRegistry,
        contractAddress: string,
        functionName: string,
        args: TypedValue[] = [],
    ): Promise<TypedOutcomeBundle> {
        const endpoint = abi.getEndpoint(functionName);
        const queryResponse = await this.runQuery(
            contractAddress,
            functionName,
            args,
        );
        return this.parseQueryResponse(queryResponse, endpoint);
    }

    protected async runQuery(
        contractAddress: string,
        functionName: string,
        args: TypedValue[] = [],
    ): Promise<SmartContractQueryResponse> {
        const argSerializer = new ArgSerializer();
        const encodedArgs = argSerializer
            .valuesToBuffers(args)
            .map((buffer) => Uint8Array.from(buffer));

        const query = new SmartContractQuery({
            contract: Address.newFromBech32(contractAddress),
            function: functionName,
            arguments: encodedArgs,
        });

        return this.queryExecutor.execute(query);
    }

    protected parseQueryResponse(
        queryResponse: SmartContractQueryResponse,
        endpoint: EndpointDefinition,
    ): TypedOutcomeBundle {
        const argSerializer = new ArgSerializer();
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
