import {
    NetworkProviderConfig,
    ProxyNetworkProvider,
    SmartContractQuery,
    SmartContractQueryResponse,
} from '@multiversx/sdk-core';
import { PerformanceProfiler } from '../utils/performance.profiler';
import { MetricsCollector } from '../utils/metrics.collector';

export class ProxyNetworkProviderProfiler extends ProxyNetworkProvider {
    constructor(url: string, config?: NetworkProviderConfig) {
        super(url, config);
    }

    async queryContract(
        query: SmartContractQuery,
    ): Promise<SmartContractQueryResponse> {
        const profiler = new PerformanceProfiler();

        const result = await super.queryContract(query);

        profiler.stop();

        MetricsCollector.setExternalCall(
            'vm.query',
            query.function,
            profiler.duration,
        );

        return result;
    }
}
