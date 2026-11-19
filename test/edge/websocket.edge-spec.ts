import WebSocket from 'ws';
import { createEdgeApp, EdgeApp } from './harness/edge.app';
import {
    createWsClient,
    firstResult,
    withEventLoopDelay,
} from './harness/drivers';

describe('Public edge WebSocket limits', () => {
    let edge: EdgeApp;

    beforeAll(async () => {
        edge = await createEdgeApp();
    });

    afterAll(async () => {
        await edge.close();
    });

    it('rejects a query sent over WebSocket', async () => {
        const client = createWsClient(edge.wsUrl);
        try {
            const started = Date.now();

            await expect(
                firstResult(client, { query: '{ echo(text: "hi") }' }),
            ).rejects.toEqual([
                expect.objectContaining({
                    message: expect.stringContaining('Only subscription'),
                }),
            ]);
            expect(Date.now() - started).toBeLessThan(1000);
        } finally {
            await client.dispose();
        }
    });

    it('rejects a 2,000-field document without blocking the event loop', async () => {
        const fields = Array.from(
            { length: 2000 },
            (_, index) => `echo(text: "${index}")`,
        ).join(' ');
        const client = createWsClient(edge.wsUrl);
        try {
            const { result, p99Ms } = await withEventLoopDelay(() =>
                firstResult(client, {
                    query: `subscription { ${fields} }`,
                }).catch((errors) => errors),
            );

            expect(result).toEqual([
                expect.objectContaining({
                    message: expect.stringMatching(/1000 tokens/),
                }),
            ]);
            expect(p99Ms).toBeLessThan(50);
        } finally {
            await client.dispose();
        }
    });

    it('accepts a message under 64 KB', async () => {
        const reply = await sendOnce(edge.wsUrl, connectionInit(63 * 1024));

        expect(reply).toEqual({ type: 'connection_ack' });
    });

    it('closes the connection on a message over 64 KB', async () => {
        const consoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        try {
            const reply = await sendOnce(edge.wsUrl, connectionInit(64 * 1024));

            expect(reply).toEqual({ closeCode: 1009 });
        } finally {
            consoleError.mockRestore();
        }
    });

    it('refuses the legacy subscriptions-transport-ws handshake', async () => {
        const socket = new WebSocket(edge.wsUrl, 'graphql-ws');
        const messages: string[] = [];
        socket.on('message', (data) => messages.push(data.toString()));
        socket.on('open', () =>
            socket.send(JSON.stringify({ type: 'connection_init' })),
        );

        const closeCode = await new Promise<number>((resolve) => {
            socket.on('close', (code) => resolve(code));
            socket.on('error', () => resolve(-1));
        });

        expect(closeCode).not.toBe(1000);
        expect(messages).not.toContainEqual(
            expect.stringContaining('connection_ack'),
        );
    });
});

// Sends one graphql-transport-ws message; reports the first reply or close.
function sendOnce(
    url: string,
    message: string,
): Promise<{ type: string } | { closeCode: number }> {
    return new Promise((resolve) => {
        const socket = new WebSocket(url, 'graphql-transport-ws');
        socket.on('open', () => socket.send(message));
        socket.on('message', (data) => {
            resolve({ type: JSON.parse(data.toString()).type });
            socket.close();
        });
        socket.on('close', (code) => resolve({ closeCode: code }));
        socket.on('error', () => resolve({ closeCode: -1 }));
    });
}

function connectionInit(paddingBytes: number): string {
    return JSON.stringify({
        type: 'connection_init',
        payload: { padding: 'a'.repeat(paddingBytes) },
    });
}
