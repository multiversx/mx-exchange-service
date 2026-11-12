import { Request, Response } from 'express';
import { Writable } from 'stream';
import * as winston from 'winston';
import {
    consoleLogFormat,
    jsonLogFormat,
    loggerFormat,
} from '../logger.formats';
import { requestIdMiddleware } from '../request.id';

function captureLogs(format: winston.Logform.Format) {
    const lines: string[] = [];
    const logger = winston.createLogger({
        format: loggerFormat(),
        transports: [
            new winston.transports.Stream({
                stream: new Writable({
                    write(chunk, _encoding, callback) {
                        lines.push(chunk.toString());
                        callback();
                    },
                }),
                format,
            }),
        ],
    });
    return { logger, lines };
}

function handleRequest(
    headers: Record<string, string>,
    handler: () => void,
): Promise<Record<string, string>> {
    const responseHeaders: Record<string, string> = {};
    const res = {
        setHeader: (name: string, value: string) => {
            responseHeaders[name.toLowerCase()] = value;
        },
    } as unknown as Response;
    const req = { headers: { ...headers } } as unknown as Request;

    return new Promise((resolve) =>
        requestIdMiddleware(req, res, () => {
            // Log from a later tick, as a resolver would.
            setImmediate(() => {
                handler();
                resolve(responseHeaders);
            });
        }),
    );
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('Log formats', () => {
    it('write single-line JSON with the request ID in deployed environments', async () => {
        const { logger, lines } = captureLogs(consoleLogFormat('mainnet'));

        const responseHeaders = await handleRequest({}, () =>
            logger.info('handled\nrequest', { context: 'Test' }),
        );
        await flush();

        expect(lines).toHaveLength(1);
        expect(lines[0].trimEnd().split('\n')).toHaveLength(1);
        expect(JSON.parse(lines[0])).toEqual({
            level: 'info',
            message: 'handled\nrequest',
            context: 'Test',
            requestId: responseHeaders['x-request-id'],
            timestamp: expect.any(String),
        });
    });

    it('omit the request ID outside a request', async () => {
        const { logger, lines } = captureLogs(consoleLogFormat('mainnet'));

        logger.info('background job');
        await flush();

        expect(JSON.parse(lines[0]).requestId).toBeUndefined();
    });

    it('keep the readable format in development and test', async () => {
        for (const nodeEnv of ['development', 'test']) {
            const { logger, lines } = captureLogs(consoleLogFormat(nodeEnv));

            logger.info('readable', { context: 'Test' });
            await flush();

            expect(lines[0]).toContain('xExchangeService');
            expect(() => JSON.parse(lines[0])).toThrow();
        }
    });

    it('drop stack traces from console and file entries alike', async () => {
        for (const format of [consoleLogFormat('mainnet'), jsonLogFormat()]) {
            const { logger, lines } = captureLogs(format);

            logger.error(new Error('boom'));
            await flush();

            expect(lines[0]).toContain('boom');
            expect(lines[0]).not.toContain('logger.formats.spec');
        }
    });
});

describe('requestIdMiddleware', () => {
    it.each(['has spaces', 'x'.repeat(129), 'line\nbreak'])(
        'replaces the malformed request ID %p',
        async (requestId) => {
            const headers = await handleRequest(
                { 'x-request-id': requestId },
                () => undefined,
            );

            expect(headers['x-request-id']).not.toBe(requestId);
            expect(headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
        },
    );
});
