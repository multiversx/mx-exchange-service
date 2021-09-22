import {
    Address,
    Balance,
    ContractFunction,
    IProvider,
    QueryResponse,
    SmartContract,
    TypedValue,
} from '@elrondnetwork/erdjs/out';
import { PerformanceProfiler } from '../utils/performance.profiler';
import { MetricsCollector } from '../utils/metrics.collector';

export class SmartContractProfiler extends SmartContract {
    runQuery(
        provider: IProvider,
        {
            func,
            args,
            value,
            caller,
        }: {
            func: ContractFunction;
            args?: TypedValue[];
            value?: Balance;
            caller?: Address;
        },
    ): Promise<QueryResponse> {
        const profiler = new PerformanceProfiler();

        try {
            const result = super.runQuery(provider, {
                func,
                args,
                value,
                caller,
            });

            profiler.stop();

            MetricsCollector.setExternalCall(
                'vm.query',
                func.name,
                profiler.duration,
            );

            return result;
        } catch (error) {
            profiler.stop();
            console.log(`Failed vm-query with error: ${error}`);
            throw error;
        }
    }
}
