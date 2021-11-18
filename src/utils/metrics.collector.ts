import { register, Histogram, collectDefaultMetrics, Gauge } from 'prom-client';

export class MetricsCollector {
    private static fieldDurationHistogram: Histogram<string>;
    private static queryDurationHistogram: Histogram<string>;
    private static externalCallsHistogram: Histogram<string>;
    private static currentNonceGauge: Gauge<string>;
    private static lastProcessedNonceGauge: Gauge<string>;
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

        if (!MetricsCollector.queryDurationHistogram) {
            MetricsCollector.queryDurationHistogram = new Histogram({
                name: 'query_duration',
                help: 'The time it takes to resolve a query',
                labelNames: ['query'],
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

        if (!MetricsCollector.currentNonceGauge) {
            MetricsCollector.currentNonceGauge = new Gauge({
                name: 'current_nonce',
                help: 'Current nonce of the given shard',
                labelNames: ['shardId'],
            });
        }

        if (!MetricsCollector.lastProcessedNonceGauge) {
            MetricsCollector.lastProcessedNonceGauge = new Gauge({
                name: 'last_processed_nonce',
                help: 'Last processed nonce of the given shard',
                labelNames: ['shardId'],
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

    static setQueryDuration(query: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.queryDurationHistogram.labels(query).observe(duration);
    }

    static setExternalCall(system: string, func: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.externalCallsHistogram
            .labels(system, func)
            .observe(duration);
    }

    static setCurrentNonce(shardId: number, nonce: number) {
        MetricsCollector.currentNonceGauge.set({ shardId }, nonce);
    }

    static setLastProcessedNonce(shardId: number, nonce: number) {
        MetricsCollector.lastProcessedNonceGauge.set({ shardId }, nonce);
    }

    static async getMetrics(): Promise<string> {
        return register.metrics();
    }
}
