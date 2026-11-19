import { httpErrorDetails, truncateForLog } from '../log.utils';

describe('truncateForLog', () => {
    it('keeps short strings unchanged', () => {
        expect(truncateForLog('short')).toBe('short');
    });

    it('serializes objects', () => {
        expect(truncateForLog({ query: '{ pairs }' })).toBe(
            '{"query":"{ pairs }"}',
        );
    });

    it('caps long values at 2 KB by default', () => {
        const truncated = truncateForLog('x'.repeat(10_000));

        expect(truncated).toHaveLength(2048);
        expect(truncated.endsWith('[truncated]')).toBe(true);
    });

    it('caps long values at the given length', () => {
        expect(truncateForLog({ data: 'y'.repeat(500) }, 100)).toHaveLength(
            100,
        );
    });

    it('keeps undefined', () => {
        expect(truncateForLog(undefined)).toBeUndefined();
    });

    it('handles values that cannot be serialized', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;

        expect(truncateForLog(circular)).toBe('[object Object]');
    });
});

describe('httpErrorDetails', () => {
    it('keeps the status and message, and truncates the response body', () => {
        const error = Object.assign(new Error('Request failed'), {
            response: { status: 502, data: 'z'.repeat(10_000) },
        });

        const details = httpErrorDetails(error);

        expect(details).toEqual({
            response: expect.stringMatching(/\[truncated\]$/),
            status: 502,
            message: 'Request failed',
        });
        expect(details.response).toHaveLength(2048);
    });

    it('handles an error without a response', () => {
        expect(httpErrorDetails(new Error('timeout'))).toEqual({
            response: undefined,
            status: undefined,
            message: 'timeout',
        });
    });
});
