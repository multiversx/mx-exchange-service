import { register, Histogram, collectDefaultMetrics, Gauge } from 'prom-client';

export class MetricsCollector {
    private static fieldDurationHistogram: Histogram<string>;
    private static queryDurationHistogram: Histogram<string>;
    private static queryCpuHistogram: Histogram<string>;
    private static redisDurationHistogram: Histogram<string>;
    private static externalCallsHistogram: Histogram<string>;
    private static awsQueryDurationHistogram: Histogram<string>;
    private static gasDifferenceHistogram: Histogram<string>;
    private static guestQueriesGauge: Gauge<string>;
    private static guestHitsGauge: Gauge<string>;
    private static guestNoCacheHitsGauge: Gauge<string>;
    private static guestHitQueriesGauge: Gauge<string>;
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
                labelNames: ['query', 'origin'],
                buckets: [],
            });
        }

        if (!MetricsCollector.queryCpuHistogram) {
            MetricsCollector.queryCpuHistogram = new Histogram({
                name: 'query_cpu',
                help: 'The CPU time it takes to resolve a query',
                labelNames: ['query', 'origin'],
                buckets: [],
            });
        }

        if (!MetricsCollector.redisDurationHistogram) {
            MetricsCollector.redisDurationHistogram = new Histogram({
                name: 'redis_duration',
                help: 'The time it takes to get from redis',
                labelNames: ['redis'],
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

        if (!MetricsCollector.awsQueryDurationHistogram) {
            MetricsCollector.awsQueryDurationHistogram = new Histogram({
                name: 'aws_query',
                help: 'AWS Timestream Queries',
                labelNames: ['query'],
                buckets: [],
            });
        }

        if (!MetricsCollector.gasDifferenceHistogram) {
            MetricsCollector.gasDifferenceHistogram = new Histogram({
                name: 'gas_difference',
                help: 'Gas Difference between gas limit and gas used',
                labelNames: ['endpoint', 'receiver'],
                buckets: [100000, 1000000, 10000000],
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

        if (!MetricsCollector.guestNoCacheHitsGauge) {
            MetricsCollector.guestNoCacheHitsGauge = new Gauge({
                name: 'guest_no_cache_hits',
                help: 'Request no-cache hits for guest users',
                labelNames: [],
            });
        }

        if (!MetricsCollector.guestQueriesGauge) {
            MetricsCollector.guestQueriesGauge = new Gauge({
                name: 'guest_queries',
                help: 'Guest queries by operation',
                labelNames: ['operation'],
            });
        }

        if (!MetricsCollector.guestHitsGauge) {
            MetricsCollector.guestHitsGauge = new Gauge({
                name: 'guest_hits',
                help: 'Request hits for guest users',
                labelNames: [],
            });
        }

        if (!MetricsCollector.guestHitQueriesGauge) {
            MetricsCollector.guestHitQueriesGauge = new Gauge({
                name: 'guest_hit_queries',
                help: 'Distinct queries for guest hit caching',
                labelNames: [],
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

    static setQueryDuration(query: string, origin: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.queryDurationHistogram
            .labels(query, origin)
            .observe(duration);
    }

    static setQueryCpu(query: string, origin: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.queryCpuHistogram
            .labels(query, origin)
            .observe(duration);
    }

    static setRedisDuration(action: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.externalCallsHistogram
            .labels('redis', action)
            .observe(duration);
        MetricsCollector.redisDurationHistogram
            .labels(action)
            .observe(duration);
    }

    static setExternalCall(system: string, func: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.externalCallsHistogram
            .labels(system, func)
            .observe(duration);
    }

    static setAWSQueryDuration(queryName: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.awsQueryDurationHistogram
            .labels(queryName)
            .observe(duration);
    }

    static setGasDifference(
        endpoint: string,
        receiver: string,
        gasDifference: number,
    ) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.gasDifferenceHistogram
            .labels(endpoint, receiver)
            .observe(gasDifference);
    }

    static setCurrentNonce(shardId: number, nonce: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.currentNonceGauge.set({ shardId }, nonce);
    }

    static setLastProcessedNonce(shardId: number, nonce: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.lastProcessedNonceGauge.set({ shardId }, nonce);
    }

    static incrementGuestQueries(operation: string, count: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.guestQueriesGauge.inc({ operation }, count);
    }

    static incrementGuestHits() {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.guestHitsGauge.inc();
    }

    static incrementGuestNoCacheHits() {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.guestNoCacheHitsGauge.inc();
    }

    static setGuestHitQueries(count: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.guestHitQueriesGauge.set(count);
    }

    static async getMetrics(): Promise<string> {
        return register.metrics();
    }
}
