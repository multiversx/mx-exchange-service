import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { createEdgeApp, graphqlRequest } from './harness/edge.app';

// Soak via `pnpm test:edge:soak`: heap before and after about 50k requests.
const REQUESTS = 50_000;
const CONCURRENCY = 100;
const MAX_HEAP_GROWTH_BYTES = 5 * 1024 * 1024;

setFlagsFromString('--expose-gc');
const gc: () => void = runInNewContext('gc');

function heapUsedAfterGc(): number {
    gc();
    gc();
    return process.memoryUsage().heapUsed;
}

const soak = process.env.EDGE_SOAK === 'true' ? describe : describe.skip;

soak('Public edge soak', () => {
    it('keeps the heap flat over many requests', async () => {
        const edge = await createEdgeApp();
        const send = () =>
            graphqlRequest(
                edge,
                { query: '{ cachedValue(key: "soak") }' },
                { 'no-cache': 'true' },
            );
        const sendMany = async (count: number) => {
            for (let sent = 0; sent < count; sent += CONCURRENCY) {
                await Promise.all(Array.from({ length: CONCURRENCY }, send));
            }
        };

        try {
            await sendMany(2_000);
            const before = heapUsedAfterGc();
            await sendMany(REQUESTS);
            const after = heapUsedAfterGc();

            console.log(
                `${REQUESTS} requests, ` +
                    `heap ${(before / 1048576).toFixed(1)} MB -> ` +
                    `${(after / 1048576).toFixed(1)} MB`,
            );
            expect(after - before).toBeLessThan(MAX_HEAP_GROWTH_BYTES);
        } finally {
            await edge.close();
        }
    }, 600_000);
});
