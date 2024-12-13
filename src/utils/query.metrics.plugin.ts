import {
    ApolloServerPlugin,
    GraphQLRequestContext,
    GraphQLRequestExecutionListener,
    GraphQLRequestListener,
} from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { PerformanceProfiler } from './performance.profiler';
import { CpuProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { MetricsCollector } from './metrics.collector';
import { FieldNode, Kind, OperationTypeNode, SelectionNode } from 'graphql';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import { Logger } from 'winston';

type QueryField = {
    name: string;
    subfields?: QueryField[];
};

@Plugin()
export class QueryMetricsPlugin implements ApolloServerPlugin {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        const logger = this.logger;
        let profiler: PerformanceProfiler;
        let cpuProfiler: CpuProfiler;
        let operationName: string;
        let origin: string;
        let queryFields: string;

        return {
            async executionDidStart(
                requestContext: GraphQLRequestContext<any>,
            ): Promise<void | GraphQLRequestExecutionListener<any>> {
                [operationName, queryFields] = deanonymizeQuery(requestContext);
                origin =
                    requestContext.request.http?.headers.get('origin') ??
                    'Unknown';

                profiler = new PerformanceProfiler();
                cpuProfiler = new CpuProfiler();
                profiler.start(operationName);
            },
            async willSendResponse(): Promise<void> {
                profiler.stop(operationName);
                const cpuTime = cpuProfiler.stop();

                if (operationName === 'filteredPairs') {
                    logger.info(queryFields, {
                        context: QueryMetricsPlugin.name,
                    });
                }

                MetricsCollector.setQueryDuration(
                    operationName,
                    origin,
                    profiler.duration,
                );

                MetricsCollector.setQueryCpu(operationName, origin, cpuTime);
            },
        };
    }
}

function deanonymizeQuery(
    requestContext: GraphQLRequestContext<any>,
): [string, string] {
    if (requestContext.operationName) {
        return [requestContext.operationName, ''];
    }

    if (!requestContext.document) {
        return [requestContext.queryHash, ''];
    }

    let debugFields: string;

    const queryNames = [];
    const definitions = requestContext.document.definitions;
    for (const definition of definitions) {
        if (
            definition.kind !== Kind.OPERATION_DEFINITION ||
            definition.operation !== OperationTypeNode.QUERY
        ) {
            continue;
        }

        const selections = definition.selectionSet.selections;
        for (const selection of selections) {
            if (selection.kind !== Kind.FIELD) {
                continue;
            }

            const name = selection.name?.value ?? 'undefined';

            if (name === 'filteredPairs') {
                const fields = extractQueryFields(
                    selection.selectionSet?.selections || [],
                );
                debugFields = JSON.stringify(fields);
            }

            queryNames.push(name);
        }
    }

    const deanonymizedQuery =
        queryNames.length > 0 ? queryNames.join('|') : requestContext.queryHash;

    return [deanonymizedQuery, debugFields];
}

function extractQueryFields(
    selectionNodes: readonly SelectionNode[],
): QueryField[] {
    const fields: QueryField[] = [];

    selectionNodes
        .filter((node): node is FieldNode => node.kind === Kind.FIELD)
        .forEach((node) => {
            if (node.selectionSet) {
                const subfields = extractQueryFields(
                    node.selectionSet.selections,
                );

                fields.push({
                    name: node.name.value,
                    subfields: subfields,
                });
            } else {
                fields.push({
                    name: node.name.value,
                });
            }
        });

    return fields;
}
