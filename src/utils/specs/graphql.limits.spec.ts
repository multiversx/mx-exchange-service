import { INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, Query, Resolver } from '@nestjs/graphql';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { AddressInfo } from 'net';
import { GraphQLError } from 'graphql';
import { apolloDriverWithWsMaxPayload, onWsSubscribe } from '../graphql.limits';

const maxPayload = 4 * 1024;

@Resolver()
class StubResolver {
    @Query(() => String)
    ping(): string {
        return 'pong';
    }
}

@Module({
    imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: apolloDriverWithWsMaxPayload(maxPayload),
            autoSchemaFile: true,
            subscriptions: {
                'graphql-ws': { path: '/graphql', onSubscribe: onWsSubscribe },
            },
        }),
    ],
    providers: [StubResolver],
})
class StubGraphQLModule {}

describe('apolloDriverWithWsMaxPayload', () => {
    let app: INestApplication;
    let url: string;

    // Sends one message and reports the first reply or the close code.
    const sendOnce = (message: string) =>
        new Promise<{ type?: string; closeCode?: number }>((resolve) => {
            const socket = new WebSocket(url, 'graphql-transport-ws');
            socket.onopen = () => socket.send(message);
            socket.onmessage = ({ data }) => {
                resolve({ type: JSON.parse(data).type });
                socket.close();
            };
            socket.onclose = ({ code }) => resolve({ closeCode: code });
        });

    const connectionInit = (size: number) =>
        JSON.stringify({
            type: 'connection_init',
            payload: { padding: 'a'.repeat(size) },
        });

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [StubGraphQLModule],
        }).compile();
        app = moduleRef.createNestApplication({ logger: false });
        await app.listen(0, '127.0.0.1');
        const { port } = app.getHttpServer().address() as AddressInfo;
        url = `ws://127.0.0.1:${port}/graphql`;
    });

    afterAll(async () => {
        await app.close();
    });

    it('accepts a message within the size limit', async () => {
        const result = await sendOnce(connectionInit(maxPayload - 100));

        expect(result).toEqual({ type: 'connection_ack' });
    });

    it('closes the connection on a message over the size limit', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        const result = await sendOnce(connectionInit(maxPayload));

        expect(result).toEqual({ closeCode: 1009 });
    });
});

describe('onWsSubscribe', () => {
    const subscribe = (query: string, operationName?: string) =>
        onWsSubscribe(undefined, '1', { query, operationName });

    it('accepts a small subscription', async () => {
        const result = await subscribe(
            'subscription { swapEvent(pairAddress: "erd1") { caller } }',
        );

        expect(result).toBeUndefined();
    });

    it('rejects a query', async () => {
        const result = await subscribe('{ pairs { address } }');

        expect(result).toEqual([expect.any(GraphQLError)]);
    });

    it('rejects a mutation', async () => {
        const result = await subscribe('mutation { doSomething }');

        expect(result).toEqual([expect.any(GraphQLError)]);
    });

    it('rejects a query selected by operation name', async () => {
        const result = await subscribe(
            'subscription S { swapEvent { caller } } query Q { pairs { address } }',
            'Q',
        );

        expect(result).toEqual([expect.any(GraphQLError)]);
    });

    it('rejects an oversized document without validating it', async () => {
        const fields = Array.from(
            { length: 2000 },
            (_, index) => `a(x: "${index}")`,
        ).join(' ');

        const start = performance.now();
        const result = await subscribe(`subscription { ${fields} }`);
        const elapsedMs = performance.now() - start;

        expect(result).toEqual([
            expect.objectContaining({
                message: expect.stringContaining('1000 tokens'),
            }),
        ]);
        expect(elapsedMs).toBeLessThan(100);
    });
});
