import {
    Client,
    createClient,
    FormattedExecutionResult,
    SubscribePayload,
} from 'graphql-ws';
import { monitorEventLoopDelay } from 'perf_hooks';
import WebSocket from 'ws';

export function createWsClient(url: string): Client {
    return createClient({
        url,
        webSocketImpl: WebSocket,
        retryAttempts: 0,
        lazy: true,
    });
}

// First result of an operation; rejects with the errors or close event.
export function firstResult(
    client: Client,
    payload: SubscribePayload,
): Promise<FormattedExecutionResult<Record<string, unknown>, unknown>> {
    return new Promise((resolve, reject) => {
        const unsubscribe = client.subscribe(payload, {
            next: (result) => {
                resolve(result);
                unsubscribe();
            },
            error: reject,
            complete: () => reject(new Error('Completed without a result')),
        });
    });
}

// Runs `action` and reports the p99 event-loop delay during it, in ms.
export async function withEventLoopDelay<T>(
    action: () => Promise<T>,
): Promise<{ result: T; p99Ms: number }> {
    const histogram = monitorEventLoopDelay({ resolution: 10 });
    histogram.enable();
    try {
        const result = await action();
        return { result, p99Ms: histogram.percentile(99) / 1e6 };
    } finally {
        histogram.disable();
    }
}
