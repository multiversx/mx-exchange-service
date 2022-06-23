import {
    ContractQueryResponse,
    ProxyNetworkProvider,
} from '@elrondnetwork/erdjs-network-providers';
import { PerformanceProfiler } from '../utils/performance.profiler';
import { MetricsCollector } from '../utils/metrics.collector';
import { IContractQuery } from '@elrondnetwork/erdjs-network-providers/out/interface';

export class ProxyNetworkProviderProfiler extends ProxyNetworkProvider {
    async queryContract(query: IContractQuery): Promise<ContractQueryResponse> {
        const profiler = new PerformanceProfiler();

        const result = super.queryContract(query);

        profiler.stop();

        MetricsCollector.setExternalCall(
            'vm.query',
            query.func.toString(),
            profiler.duration,
        );

        return result;
    }
}
