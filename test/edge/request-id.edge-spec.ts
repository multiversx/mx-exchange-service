import { createEdgeApp, EdgeApp, graphqlRequest } from './harness/edge.app';

describe('Request IDs', () => {
    let edge: EdgeApp;

    beforeAll(async () => {
        edge = await createEdgeApp();
    });

    afterAll(async () => {
        await edge.close();
    });

    const query = { query: '{ echo(text: "id") }' };

    it('echo the caller request ID', async () => {
        const response = await graphqlRequest(edge, query, {
            'x-request-id': 'integrator.42:a_b',
        });

        expect(response.headers['x-request-id']).toBe('integrator.42:a_b');
    });

    it('are generated when the caller sends none', async () => {
        const first = await graphqlRequest(edge, query);
        const second = await graphqlRequest(edge, query);

        expect(first.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
        expect(second.headers['x-request-id']).not.toBe(
            first.headers['x-request-id'],
        );
    });

    it('tag log entries written while handling the request', async () => {
        const entries = await edge.captureLogs(() =>
            graphqlRequest(
                edge,
                { query: '{ failing }' },
                { 'x-request-id': 'trace-123' },
            ),
        );

        expect(entries).toContainEqual(
            expect.objectContaining({
                level: 'error',
                requestId: 'trace-123',
            }),
        );
    });
});
