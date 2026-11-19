import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

const VALID_REQUEST_ID = /^[\w.:-]{1,128}$/;
const requestIdStorage = new AsyncLocalStorage<string>();

export function currentRequestId(): string | undefined {
    return requestIdStorage.getStore();
}

// Tags request, response and log entries with the caller's or a new ID.
export function requestIdMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId =
        typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming)
            ? incoming
            : randomUUID();

    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    requestIdStorage.run(requestId, next);
}
