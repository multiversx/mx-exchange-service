import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { status } from '@grpc/grpc-js';
import { delay } from 'src/helpers/helpers';
import { MetricsCollector } from 'src/utils/metrics.collector';

const MAX_RETRIES = 30;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 5000;

export function StateRpcMetrics() {
    return (
        _target: object,
        _key: string | symbol,
        descriptor: PropertyDescriptor,
    ) => {
        const childMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const profiler = new PerformanceProfiler();
            let lastError: Error | undefined;

            try {
                for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        return await childMethod.apply(this, args);
                    } catch (error: any) {
                        const isUnavailable = error?.code === status.UNAVAILABLE;
                        const hasRetriesLeft = attempt < MAX_RETRIES;

                        if (!isUnavailable || !hasRetriesLeft) {
                            throw error;
                        }

                        lastError = error;
                        const delayMs = Math.min(
                            BASE_DELAY_MS * Math.pow(1.5, attempt),
                            MAX_DELAY_MS,
                        );
                        await delay(delayMs);
                    }
                }
                throw lastError;
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
