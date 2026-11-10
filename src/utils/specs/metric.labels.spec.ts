import { buildSchema, parse } from 'graphql';
import {
    LabelLimiter,
    operationLabel,
    operationLabelFromQuery,
    originLabel,
} from '../metric.labels';

describe('operationLabel', () => {
    const label = (query: string, operationName?: string) =>
        operationLabel(parse(query), operationName);

    it('joins the sorted root field names', () => {
        expect(label('{ pairs { address } farms { address } }')).toBe(
            'farms|pairs',
        );
    });

    it('ignores the client operation name', () => {
        expect(label('query RandomName123 { pairs { address } }')).toBe(
            'pairs',
        );
    });

    it('uses field names, not aliases, once each', () => {
        expect(label('{ a: pairs { address } b: pairs { address } }')).toBe(
            'pairs',
        );
    });

    it('resolves root fields in fragments and inline fragments', () => {
        expect(
            label(`
                query { ...Root ... on Query { tokens { identifier } } }
                fragment Root on Query { pairs { address } ...Nested }
                fragment Nested on Query { farms { address } }
            `),
        ).toBe('farms|pairs|tokens');
    });

    it('survives recursive fragment spreads', () => {
        expect(
            label(`
                query { ...A }
                fragment A on Query { pairs { address } ...B }
                fragment B on Query { farms { address } ...A }
            `),
        ).toBe('farms|pairs');
    });

    it('labels the selected operation of a multi-operation document', () => {
        const query = `
            query First { pairs { address } }
            subscription Second { swapEvent { caller } }
            mutation Third { doSomething }
        `;

        expect(label(query, 'Second')).toBe('swapEvent');
        expect(label(query, 'Third')).toBe('doSomething');
    });

    it('falls back to other when the operation cannot be selected', () => {
        const query = 'query A { pairs { address } } query B { farms }';

        expect(label(query)).toBe('other');
        expect(label(query, 'Unknown')).toBe('other');
        expect(operationLabel(undefined)).toBe('other');
    });

    it('truncates long labels to 120 characters', () => {
        const fields = Array.from(
            { length: 30 },
            (_, index) => `field${index}`,
        ).join(' ');

        expect(label(`{ ${fields} }`)).toHaveLength(120);
    });

    it('keeps only root fields that exist in the schema', () => {
        const schema = buildSchema('type Query { pairs: [String] }');

        expect(
            operationLabel(
                parse('{ pairs madeUpField __typename }'),
                undefined,
                schema,
            ),
        ).toBe('__typename|pairs');
        expect(
            operationLabel(parse('{ madeUpField }'), undefined, schema),
        ).toBe('other');
    });
});

describe('operationLabelFromQuery', () => {
    it('labels a query string', () => {
        expect(operationLabelFromQuery('{ pairs { address } }')).toBe('pairs');
    });

    it('falls back to other for an unparsable or oversized query', () => {
        expect(operationLabelFromQuery('{ pairs {')).toBe('other');
        expect(operationLabelFromQuery(`{ ${'pairs '.repeat(2000)} }`)).toBe(
            'other',
        );
    });
});

describe('originLabel', () => {
    it.each([
        'https://app.hatom.com',
        'chrome-extension://dngmlblcodfobpdpecaadgfbcggfjfnm',
        'http://services-api-elrond-service.mainnet-api.svc.cluster.local:443',
        'data-api',
    ])('keeps the origin %s', (origin) => {
        expect(originLabel(origin)).toBe(origin);
    });

    it.each([
        ['longer than 100 characters', `https://${'a'.repeat(93)}`],
        ['with spaces', 'https://app.example com'],
        ['with quotes', 'https://app.example/"x"'],
        ['with non-ASCII letters', 'https://xexchänge.com'],
    ])('maps an origin %s to other', (_, origin) => {
        expect(originLabel(origin)).toBe('other');
    });

    it('maps a missing origin to none', () => {
        expect(originLabel(undefined)).toBe('none');
        expect(originLabel(null)).toBe('none');
        expect(originLabel('')).toBe('none');
    });
});

describe('LabelLimiter', () => {
    it('passes new label sets until the limit, then maps them to other', () => {
        const limiter = new LabelLimiter(2);

        expect(limiter.limit(['pairs', 'https://app.hatom.com'])).toEqual([
            'pairs',
            'https://app.hatom.com',
        ]);
        expect(limiter.limit(['farms', 'none'])).toEqual(['farms', 'none']);
        expect(limiter.limit(['tokens', 'none'])).toEqual(['other', 'other']);
    });

    it('keeps passing label sets seen before the limit was reached', () => {
        const limiter = new LabelLimiter(1);
        limiter.limit(['pairs', 'https://app.hatom.com']);
        limiter.limit(['farms', 'none']);

        expect(limiter.limit(['pairs', 'https://app.hatom.com'])).toEqual([
            'pairs',
            'https://app.hatom.com',
        ]);
    });

    it('reports each label set it maps to other', () => {
        const onOverflow = jest.fn();
        const limiter = new LabelLimiter(1, onOverflow);

        limiter.limit(['pairs', 'none']);
        limiter.limit(['pairs', 'none']);
        expect(onOverflow).not.toHaveBeenCalled();

        limiter.limit(['farms', 'none']);
        limiter.limit(['tokens', 'none']);
        expect(onOverflow).toHaveBeenCalledTimes(2);
    });
});
