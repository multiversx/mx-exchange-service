import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { MetricsCollector } from 'src/utils/metrics.collector';

export function StateRpcMetrics() {
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

                MetricsCollector.setStateRpcDuration(
                    childMethod.name,
                    profiler.duration,
                );
            }
        };
        return descriptor;
    };
}
