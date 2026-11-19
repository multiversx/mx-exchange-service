import { randomUUID } from 'crypto';
import { createEdgeApp, EdgeApp, graphqlRequest } from './harness/edge.app';

describe('Guest cache', () => {
    let edge: EdgeApp;

    beforeAll(async () => {
        edge = await createEdgeApp();
    });

    afterAll(async () => {
        await edge.close();
    });

    const guestCacheKeys = () => edge.redis.keys('guestCache.*');

    async function sendTimes(body: Record<string, unknown>, times: number) {
        for (let sent = 0; sent < times; sent++) {
            await graphqlRequest(edge, body);
        }
    }

    it('stores a small anonymous query for warming', async () => {
        const body = { query: `{ echo(text: "${randomUUID()}") }` };
        const before = await edge.redis.keys('guestCache.*.body');

        await sendTimes(body, 4);

        const added = (await edge.redis.keys('guestCache.*.body')).filter(
            (key) => !before.includes(key),
        );
        expect(added).toHaveLength(1);
        expect(JSON.parse(await edge.redis.get(added[0]))).toEqual(body);
    });

    it('ignores a body larger than the guest-cache limit', async () => {
        const body = {
            query: `{ echo(text: "${randomUUID()}${'x'.repeat(20 * 1024)}") }`,
        };
        const before = await guestCacheKeys();

        await sendTimes(body, 4);

        expect(await guestCacheKeys()).toHaveLength(before.length);
    });

    it('refuses to start with a size limit that is not a number', async () => {
        const failure = await createEdgeApp({
            GUEST_CACHE_MAX_BODY_SIZE: '16kb',
        }).then(
            async (started) => {
                await started.close();
                return undefined;
            },
            (error: Error) => error,
        );

        expect(failure?.message).toContain('GUEST_CACHE_MAX_BODY_SIZE');
    });

    it('ignores a body that is not a GraphQL request', async () => {
        const body = { notAQuery: randomUUID() };
        const before = await guestCacheKeys();

        await sendTimes(body, 4);

        expect(await guestCacheKeys()).toHaveLength(before.length);
    });
});
