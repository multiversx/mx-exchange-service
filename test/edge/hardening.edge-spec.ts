import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createWsClient, firstResult } from './harness/drivers';
import { createEdgeApp, EdgeApp, graphqlRequest } from './harness/edge.app';
import { STUB_INTERNAL_ERROR } from './harness/stub.module';

const INTROSPECTION_QUERY = '{ __schema { queryType { name } } }';

describe('GraphQL and HTTP hardening', () => {
    describe('introspection', () => {
        it('is refused with the flag off', async () => {
            const edge = await createEdgeApp({ ENABLE_INTROSPECTION: 'false' });
            try {
                const response = await graphqlRequest(edge, {
                    query: INTROSPECTION_QUERY,
                });

                expect(response.body.data).toBeUndefined();
                expect(response.body.errors).toEqual([
                    expect.objectContaining({
                        message: expect.stringContaining('introspection'),
                    }),
                ]);
            } finally {
                await edge.close();
            }
        });

        it('is allowed with the flag on', async () => {
            const edge = await createEdgeApp({ ENABLE_INTROSPECTION: 'true' });
            try {
                const response = await graphqlRequest(edge, {
                    query: INTROSPECTION_QUERY,
                });

                expect(response.body).toEqual({
                    data: { __schema: { queryType: { name: 'Query' } } },
                });
            } finally {
                await edge.close();
            }
        });
    });

    describe('responses', () => {
        let edge: EdgeApp;

        beforeAll(async () => {
            edge = await createEdgeApp();
        });

        afterAll(async () => {
            await edge.close();
        });

        it('hide internal error details and log them', async () => {
            let response: Awaited<ReturnType<typeof graphqlRequest>>;
            const entries = await edge.captureLogs(async () => {
                response = await graphqlRequest(edge, {
                    query: '{ failing }',
                });
            });

            expect(response.body.errors).toEqual([
                {
                    message: 'Internal server error',
                    path: ['failing'],
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                },
            ]);
            expect(JSON.stringify(response.body)).not.toContain(
                STUB_INTERNAL_ERROR,
            );
            expect(entries).toContainEqual(
                expect.objectContaining({
                    level: 'error',
                    message: `${STUB_INTERNAL_ERROR} at failing`,
                }),
            );
        });

        it.each(['failingSubscription', 'failingStream'])(
            'hide internal error details over WebSocket and log them (%s)',
            async (field) => {
                const client = createWsClient(edge.wsUrl);
                try {
                    let errors: unknown;
                    const entries = await edge.captureLogs(async () => {
                        errors = await firstResult(client, {
                            query: `subscription { ${field} }`,
                        }).then(
                            (result) => result.errors,
                            (errors) => errors,
                        );
                    });

                    expect(errors).toEqual([
                        expect.objectContaining({
                            message: 'Internal server error',
                            extensions: { code: 'INTERNAL_SERVER_ERROR' },
                        }),
                    ]);
                    expect(JSON.stringify(errors)).not.toContain(
                        STUB_INTERNAL_ERROR,
                    );
                    expect(entries).toContainEqual(
                        expect.objectContaining({
                            level: 'error',
                            message:
                                expect.stringContaining(STUB_INTERNAL_ERROR),
                        }),
                    );
                } finally {
                    await client.dispose();
                }
            },
        );

        it('keep validation error messages over WebSocket', async () => {
            const client = createWsClient(edge.wsUrl);
            try {
                await expect(
                    firstResult(client, {
                        query: 'subscription { unknownField }',
                    }),
                ).rejects.toEqual([
                    expect.objectContaining({
                        message: expect.stringContaining('unknownField'),
                    }),
                ]);
            } finally {
                await client.dispose();
            }
        });

        it('keep user input error messages', async () => {
            const response = await graphqlRequest(edge, {
                query: 'query ($text: String!) { echo(text: $text) }',
                variables: { text: 5 },
            });

            expect(response.body.errors).toEqual([
                expect.objectContaining({
                    message: expect.stringContaining(
                        'String cannot represent a non string value',
                    ),
                    extensions: { code: 'BAD_USER_INPUT' },
                }),
            ]);
        });

        it('keep validation error messages', async () => {
            const response = await graphqlRequest(edge, {
                query: '{ unknownField }',
            });

            expect(response.body.errors).toEqual([
                expect.objectContaining({
                    message: expect.stringContaining('unknownField'),
                    extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
                }),
            ]);
        });

        it('carry security headers', async () => {
            const response = await graphqlRequest(edge, {
                query: '{ echo(text: "headers") }',
            });

            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-powered-by']).toBeUndefined();
        });

        it.each([
            [
                'too large',
                JSON.stringify({
                    query: `{ echo(text: "${'a'.repeat(1024 * 1024)}") }`,
                }),
                413,
            ],
            ['malformed', '{"query":', 400],
        ])(
            'carry security, CORS and request ID headers when the body is %s',
            async (_case, body, status) => {
                const response = await edge
                    .http()
                    .post('/graphql')
                    .set('content-type', 'application/json')
                    .set('origin', 'https://integrator.example')
                    .set('x-request-id', 'rejected-body')
                    .send(body);

                expect(response.status).toBe(status);
                expect(response.headers['x-content-type-options']).toBe(
                    'nosniff',
                );
                expect(response.headers['access-control-allow-origin']).toBe(
                    '*',
                );
                expect(response.headers['x-request-id']).toBe('rejected-body');
            },
        );

        it('allow cross-origin requests from any origin', async () => {
            const response = await graphqlRequest(
                edge,
                { query: '{ echo(text: "cors") }' },
                { origin: 'https://integrator.example' },
            );
            const preflight = await edge
                .http()
                .options('/graphql')
                .set('origin', 'https://integrator.example')
                .set('access-control-request-method', 'POST');

            expect(response.headers['access-control-allow-origin']).toBe('*');
            expect(response.headers['access-control-allow-credentials']).toBe(
                undefined,
            );
            expect(preflight.status).toBe(204);
            expect(preflight.headers['access-control-allow-origin']).toBe('*');
        });
    });

    describe('schema', () => {
        it('is built in memory, even in development', async () => {
            const workingDirectory = process.cwd();
            const directory = mkdtempSync(join(tmpdir(), 'edge-schema-'));
            process.chdir(directory);
            try {
                const edge = await createEdgeApp({ NODE_ENV: 'development' });
                await edge.close();

                expect(readdirSync(directory)).toEqual([]);
            } finally {
                process.chdir(workingDirectory);
                rmSync(directory, { recursive: true, force: true });
            }
        });
    });
});
