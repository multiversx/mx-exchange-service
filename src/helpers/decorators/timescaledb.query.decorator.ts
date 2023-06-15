import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';

export function TimescaleDBQuery() {
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
            } catch (errors) {
                if (Array.isArray(errors)) {
                    const errorIds: string[] = errors?.map(
                        (error) => error?.extensions?.id,
                    );
                    throw new Error(
                        `Data API Internal Error. Error IDs: ${errorIds.join()}`,
                    );
                } else {
                    throw new Error(
                        `Data API Internal Error. Error: ${errors.message}`,
                    );
                }
            } finally {
                profiler.stop();
                MetricsCollector.setDataApiQueryDuration(
                    childMethod.name,
                    profiler.duration,
                );
            }
        };
        return descriptor;
    };
}
