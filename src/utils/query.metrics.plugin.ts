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
import { Kind, OperationTypeNode } from 'graphql';

@Plugin()
export class QueryMetricsPlugin implements ApolloServerPlugin {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        let profiler: PerformanceProfiler;
        let cpuProfiler: CpuProfiler;
        let operationName: string;
        let origin: string;

        return {
            async executionDidStart(
                requestContext: GraphQLRequestContext<any>,
            ): Promise<void | GraphQLRequestExecutionListener<any>> {
                operationName = deanonymizeQuery(requestContext);
                origin =
                    requestContext.request.http?.headers.get('origin') ??
                    'Unknown';

                profiler = new PerformanceProfiler();
                cpuProfiler = new CpuProfiler();
                profiler.start(operationName);
            },
            async willSendResponse({ contextValue }): Promise<void> {
                if (profiler === undefined) {
                    return;
                }

                profiler.stop(operationName);
                const cpuTime = cpuProfiler.stop();

                MetricsCollector.setQueryDuration(
                    operationName,
                    origin,
                    profiler.duration,
                );

                MetricsCollector.setQueryCpu(operationName, origin, cpuTime);

                if (contextValue.complexity) {
                    MetricsCollector.setQueryComplexity(
                        operationName,
                        origin,
                        contextValue.complexity,
                    );
                }
            },
        };
    }
}

function deanonymizeQuery(requestContext: GraphQLRequestContext<any>): string {
    if (requestContext.operationName) {
        return requestContext.operationName;
    }

    if (!requestContext.document) {
        return requestContext.queryHash;
    }

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

            queryNames.push(name);
        }
    }

    return queryNames.length > 0
        ? queryNames.join('|')
        : requestContext.queryHash;
}
