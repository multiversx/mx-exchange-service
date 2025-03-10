import { MetricsService } from '@multiversx/sdk-nestjs-monitoring';
import { register, Histogram, Gauge } from 'prom-client';

export class MetricsCollector {
    private static fieldDurationHistogram: Histogram<string>;
    private static queryDurationHistogram: Histogram<string>;
    private static queryCpuHistogram: Histogram<string>;
    private static queryComplexityHistogram: Histogram<string>;
    private static awsQueryDurationHistogram: Histogram<string>;
    private static dataApiQueryDurationHistogram: Histogram<string>;
    private static vmQueryDurationHistogram: Histogram<string>;
    private static gasDifferenceHistogram: Histogram<string>;
    private static guestQueriesGauge: Gauge<string>;
    private static currentNonceGauge: Gauge<string>;
    private static lastProcessedNonceGauge: Gauge<string>;
    private static localCacheHitGauge: Gauge<string>;
    private static cacheMissGauge: Gauge<string>;

    private static baseMetrics = new MetricsService();

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

        if (!MetricsCollector.queryComplexityHistogram) {
            MetricsCollector.queryComplexityHistogram = new Histogram({
                name: 'query_complexity',
                help: 'The estimated complexity of a query',
                labelNames: ['query', 'origin'],
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

        if (!MetricsCollector.dataApiQueryDurationHistogram) {
            MetricsCollector.dataApiQueryDurationHistogram = new Histogram({
                name: 'data_api_query',
                help: 'Data API Queries',
                labelNames: ['query'],
                buckets: [],
            });
        }

        if (!MetricsCollector.vmQueryDurationHistogram) {
            MetricsCollector.vmQueryDurationHistogram = new Histogram({
                name: 'vm_query_duration',
                help: 'VM Queries',
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

        if (!MetricsCollector.guestQueriesGauge) {
            MetricsCollector.guestQueriesGauge = new Gauge({
                name: 'guest_queries',
                help: 'Guest queries by operation',
                labelNames: ['operation'],
            });
        }

        if (!MetricsCollector.localCacheHitGauge) {
            MetricsCollector.localCacheHitGauge = new Gauge({
                name: 'local_cached_hits',
                help: 'Number of hits for local cached data',
                labelNames: ['key'],
            });
        }

        if (!MetricsCollector.cacheMissGauge) {
            MetricsCollector.cacheMissGauge = new Gauge({
                name: 'cache_misses',
                help: 'Number of cache misses',
                labelNames: ['key'],
            });
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

    static setQueryComplexity(
        query: string,
        origin: string,
        complexity: number,
    ) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.queryComplexityHistogram
            .labels(query, origin)
            .observe(complexity);
    }

    static setRedisDuration(action: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.baseMetrics.setExternalCall('redis', duration);
        MetricsCollector.baseMetrics.setRedisDuration(action, duration);
    }

    static setApiCall(
        endpoint: string,
        origin: string,
        status: number,
        duration: number,
    ) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.baseMetrics.setApiCall(
            endpoint,
            origin,
            status,
            duration,
        );
    }

    static setExternalCall(system: string, func: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        if (system === 'vm.query') {
            MetricsCollector.vmQueryDurationHistogram
                .labels(func)
                .observe(duration);
        }
        MetricsCollector.baseMetrics.setExternalCall(system, duration);
    }

    static setAWSQueryDuration(queryName: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.awsQueryDurationHistogram
            .labels(queryName)
            .observe(duration);
    }

    static setDataApiQueryDuration(queryName: string, duration: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.dataApiQueryDurationHistogram
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
        MetricsService.incrementGuestHits();
    }

    static incrementGuestNoCacheHits() {
        MetricsCollector.ensureIsInitialized();
        MetricsService.incrementGuestNoCacheHits();
    }

    static setGuestHitQueries(count: number) {
        MetricsCollector.ensureIsInitialized();
        MetricsService.setGuestHitQueries(count);
    }

    static incrementLocalCacheHit(key: string) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.localCacheHitGauge.inc({ key });
    }

    static incrementCachedApiHit(endpoint: string) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.baseMetrics.incrementCachedApiHit(endpoint);
    }

    static incrementCacheMiss(key: string) {
        MetricsCollector.ensureIsInitialized();
        MetricsCollector.cacheMissGauge.inc({ key });
    }

    static async getMetrics(): Promise<string> {
        const baseMetrics = await MetricsCollector.baseMetrics.getMetrics();
        const currentMetrics = await register.metrics();

        return baseMetrics + '\n' + currentMetrics;
    }
}
