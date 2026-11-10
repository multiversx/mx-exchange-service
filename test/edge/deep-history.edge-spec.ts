import { randomUUID } from 'crypto';
import { createEdgeApp, EdgeApp, graphqlRequest } from './harness/edge.app';
import { STUB_CACHE_BASE_KEY } from './harness/stub.module';

async function cachedValue(
    edge: EdgeApp,
    key: string,
    headers: Record<string, string> = {},
): Promise<string> {
    const response = await graphqlRequest(
        edge,
        { query: `{ cachedValue(key: "${key}") }` },
        headers,
    );
    expect(response.status).toBe(200);
    return response.body.data.cachedValue;
}

function cacheKeysFor(edge: EdgeApp, key: string): Promise<string[]> {
    return edge.redis.keys(`${STUB_CACHE_BASE_KEY}.cachedValue.${key}*`);
}

describe('Deep-history timestamp header', () => {
    let edge: EdgeApp;

    beforeAll(async () => {
        // The retired flag may linger in deployed environments.
        edge = await createEdgeApp({ ENABLE_DEEP_HISTORY: 'true' });
    });

    afterAll(async () => {
        await edge.close();
    });

    it.each(['1700000000', '1&size=1', '17000000000'])(
        'serves the current cached value for timestamp %p',
        async (timestamp) => {
            const key = randomUUID();

            const current = await cachedValue(edge, key);

            expect(await cachedValue(edge, key, { timestamp })).toEqual(
                current,
            );
            expect(await cacheKeysFor(edge, key)).toHaveLength(1);
        },
    );
});
