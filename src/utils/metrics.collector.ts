import { register, Histogram, collectDefaultMetrics } from 'prom-client';

export class MetricsCollector {
    private static fieldDurationHistogram: Histogram<string>;
    private static externalCallsHistogram: Histogram<string>;
    private static isDefaultMetricsRegistered = false;

    static ensureIsInitialized() {
        if (!MetricsCollector.fieldDurationHistogram) {
            MetricsCollector.fieldDurationHistogram = new Histogram({
                name: 'field_duration',
                help: 'The time it takes to resolve a field',
                labelNames: ['name', 'path'],
                buckets: [],
            });
        }

        if (!MetricsCollector.externalCallsHistogram) {
            MetricsCollector.externalCallsHistogram = new Histogram({
                name: 'external_apis',
                help: 'External Calls',
                labelNames: ['system', 'func'],
                buckets: [],
            });
        }

        if (!MetricsCollector.isDefaultMetricsRegistered) {
            MetricsCollector.isDefaultMetricsRegistered = true;
            collectDefaultMetrics();
        }
    }

    static setFieldDuration(name: string, path: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.fieldDurationHistogram
            .labels(name, path)
            .observe(duration);
    }

    static setExternalCall(system: string, func: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.externalCallsHistogram
            .labels(system, func)
            .observe(duration);
    }

    static async getMetrics(): Promise<string> {
        return register.metrics();
    }
}
