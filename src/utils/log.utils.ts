const TRUNCATED_MARKER = '…[truncated]';

// Serializes a value for logs, capped at `maxLength`; undefined stays absent.
export function truncateForLog(value: unknown, maxLength = 2048): string {
    if (value === undefined) {
        return undefined;
    }

    let text: string;
    if (typeof value === 'string') {
        text = value;
    } else {
        try {
            text = JSON.stringify(value) ?? String(value);
        } catch {
            text = String(value);
        }
    }

    if (text.length <= maxLength) {
        return text;
    }
    return (
        text.slice(0, maxLength - TRUNCATED_MARKER.length) + TRUNCATED_MARKER
    );
}

// Status, message and truncated response body of a failed HTTP call.
export function httpErrorDetails(error: any): {
    response: string | undefined;
    status: number | undefined;
    message: string;
} {
    return {
        response: truncateForLog(error.response?.data),
        status: error.response?.status,
        message: error.message,
    };
}
