import { GraphQLError } from 'graphql';
import { onWsSubscribe } from '../graphql.limits';

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
