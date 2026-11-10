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
import { ApiConfigService } from 'src/helpers/api.config.service';
import { LabelLimiter, operationLabel, originLabel } from './metric.labels';

@Plugin()
export class QueryMetricsPlugin implements ApolloServerPlugin {
    private readonly labelPairs: LabelLimiter;

    constructor(apiConfig: ApiConfigService) {
        this.labelPairs = new LabelLimiter(
            apiConfig.getMetricsMaxQueryLabelPairs(),
            () => MetricsCollector.incrementLabelOverflow('query'),
        );
    }

    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        const labelPairs = this.labelPairs;
        let profiler: PerformanceProfiler;
        let cpuProfiler: CpuProfiler;
        let operationName: string;
        let origin: string;

        return {
            async executionDidStart(
                requestContext: GraphQLRequestContext<any>,
            ): Promise<void | GraphQLRequestExecutionListener<any>> {
                [operationName, origin] = labelPairs.limit([
                    operationLabel(
                        requestContext.document,
                        requestContext.request.operationName,
                        requestContext.schema,
                    ),
                    originLabel(
                        requestContext.request.http?.headers.get('origin'),
                    ),
                ]);

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
