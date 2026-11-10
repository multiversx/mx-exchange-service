import { createEdgeApp, EdgeApp, graphqlRequest } from './harness/edge.app';
import { createWsClient, firstResult } from './harness/drivers';

describe('Public edge smoke', () => {
    let edge: EdgeApp;

    beforeAll(async () => {
        edge = await createEdgeApp();
    });

    afterAll(async () => {
        await edge.close();
    });

    it('answers a query over HTTP', async () => {
        const response = await graphqlRequest(edge, {
            query: '{ echo(text: "hello", items: ["a", "b"]) }',
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: { echo: 'hello,a,b' } });
    });

    it('delivers a Redis-published event to a WebSocket subscriber', async () => {
        const client = createWsClient(edge.wsUrl);
        const result = firstResult(client, {
            query: 'subscription { edgeEvent }',
        });

        // Publish until the first event, as the subscriber may not be ready.
        const publisher = setInterval(() => edge.publish('ping'), 50);
        try {
            await expect(result).resolves.toEqual({
                data: { edgeEvent: 'ping' },
            });
        } finally {
            clearInterval(publisher);
            await client.dispose();
        }
    });
});
