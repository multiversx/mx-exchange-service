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
                operationName = requestContext.operationName;
                if (!operationName) {
                    operationName = requestContext.queryHash;
                }
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
