import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { MetricsCollector } from 'src/utils/metrics.collector';

export enum MongoCollections {
    Pairs = 'pairs',
    Tokens = 'esdt_tokens',
    Farms = 'farms',
    Staking = 'staking_farms',
    StakingProxy = 'staking_proxy',
    GlobalInfo = 'rewards_global_info',
}

export enum MongoQueries {
    Create = 'create',
    Find = 'find',
    Upsert = 'upsert',
    Update = 'update',
    BulkWrite = 'bulkWrite',
}

export function PersistenceMetrics(
    collection: MongoCollections,
    query: MongoQueries,
    operationArgIndex?: number,
) {
    return (
        _target: object,
        _key: string | symbol,
        descriptor: PropertyDescriptor,
    ) => {
        const childMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const profiler = new PerformanceProfiler();

            try {
                return await childMethod.apply(this, args);
            } finally {
                profiler.stop();

                let operation = childMethod.name;

                if (
                    operationArgIndex !== undefined &&
                    args[operationArgIndex] !== undefined
                ) {
                    operation = `${operation}.${args[operationArgIndex]}`;
                }

                MetricsCollector.setPersistenceQueryDuration(
                    collection,
                    query,
                    operation,
                    profiler.duration,
                );
            }
        };
        return descriptor;
    };
}
