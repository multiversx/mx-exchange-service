import { randomUUID } from 'crypto';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { createEdgeApp, EdgeApp, graphqlRequest } from './harness/edge.app';

const STUB_ROOT_FIELDS = ['cachedValue', 'echo', 'failing'];
const QUERY_LABEL_PAIRS = 10;
const GUEST_OPERATION_LABELS = 3;
const RANDOM_ORIGIN_REQUESTS = 50;
const INTEGRATOR = 'https://app.hatom.com';

// Distinct label sets of one metric, as exposed on /metrics.
async function labelSets(sample: string): Promise<Record<string, string>[]> {
    const metrics = await MetricsCollector.getMetrics();
    const pattern = new RegExp(`^${sample}\\{(.*)\\} `, 'gm');
    const distinct = new Set(
        [...metrics.matchAll(pattern)].map(([, labels]) => labels),
    );
    return [...distinct].map((labels) =>
        Object.fromEntries(
            [...labels.matchAll(/(\w+)="([^"]*)"/g)].map(([, key, value]) => [
                key,
                value,
            ]),
        ),
    );
}

// Value of one sample on /metrics, or 0 before it is first recorded.
async function sampleValue(sample: string): Promise<number> {
    const metrics = await MetricsCollector.getMetrics();
    const line = metrics
        .split('\n')
        .find((entry) => entry.startsWith(`${sample} `));
    return line ? Number(line.slice(sample.length + 1)) : 0;
}

function isStubOperation(label: string): boolean {
    return (
        label === 'other' ||
        label.split('|').every((field) => STUB_ROOT_FIELDS.includes(field))
    );
}

describe('Query metric labels', () => {
    let edge: EdgeApp;

    beforeAll(async () => {
        edge = await createEdgeApp({
            METRICS_MAX_QUERY_LABEL_PAIRS: String(QUERY_LABEL_PAIRS),
            METRICS_MAX_GUEST_OPERATION_LABELS: String(GUEST_OPERATION_LABELS),
        });
    });

    afterAll(async () => {
        await edge.close();
    });

    it('keep origins seen first and cap new query label pairs', async () => {
        const queryOverflow = () =>
            sampleValue('metric_label_overflow_total{metric="query"}');
        const overflowBefore = await queryOverflow();

        await graphqlRequest(
            edge,
            { query: '{ echo(text: "integrator") }' },
            { origin: INTEGRATOR },
        );
        await graphqlRequest(edge, { query: '{ echo(text: "no origin") }' });
        for (let index = 0; index < RANDOM_ORIGIN_REQUESTS; index++) {
            const operationName = `Op${randomUUID().replace(/-/g, '')}`;
            await graphqlRequest(
                edge,
                {
                    query: `query ${operationName} { echo(text: "${index}") }`,
                    operationName,
                },
                { origin: `https://${randomUUID()}.example` },
            );
        }
        await graphqlRequest(
            edge,
            { query: '{ echo(text: "integrator again") }' },
            { origin: INTEGRATOR },
        );

        const labels = await labelSets('query_duration_count');

        expect(labels).toHaveLength(QUERY_LABEL_PAIRS + 1);
        for (const { query } of labels) {
            expect(isStubOperation(query)).toBe(true);
        }
        expect(labels).toEqual(
            expect.arrayContaining([
                { query: 'echo', origin: 'none' },
                { query: 'other', origin: 'other' },
            ]),
        );
        expect(
            await sampleValue(
                `query_duration_count{query="echo",origin="${INTEGRATOR}"}`,
            ),
        ).toBe(2);
        expect((await queryOverflow()) - overflowBefore).toBeGreaterThanOrEqual(
            RANDOM_ORIGIN_REQUESTS - QUERY_LABEL_PAIRS,
        );
    });

    it('label guest queries by known root fields, up to the limit', async () => {
        const guestOverflow = () =>
            sampleValue('metric_label_overflow_total{metric="guest_queries"}');
        const overflowBefore = await guestOverflow();
        const operationName = `Op${randomUUID().replace(/-/g, '')}`;
        const selections = [
            '{ echo(text: "guest") }',
            '{ madeUp }',
            '{ failing }',
            '{ echo(text: "guest") failing }',
        ];

        for (const selection of selections) {
            // Two guest-cache batches, so a minute boundary cannot skip both.
            for (let sent = 0; sent < 6; sent++) {
                await graphqlRequest(edge, {
                    query: `query ${operationName} ${selection}`,
                    operationName,
                });
            }
        }

        const labels = await labelSets('guest_queries');

        expect(labels.map(({ operation }) => operation).sort()).toEqual([
            'echo',
            'failing',
            'other',
        ]);
        expect((await guestOverflow()) - overflowBefore).toBeGreaterThan(0);
    });
});
