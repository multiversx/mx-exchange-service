import crypto from 'crypto-js';

export class PendingExecutor<TIN, TOUT> {
    private dictionary: Record<string, Promise<TOUT>> = {};

    constructor(private readonly executor: (value: any) => Promise<TOUT>) {}

    async execute(value: TIN): Promise<TOUT> {
        const key = crypto.MD5(JSON.stringify(value)).toString();

        let pendingRequest = this.dictionary[key];
        if (pendingRequest) {
            return await pendingRequest;
        }

        pendingRequest = this.executor(value);
        this.dictionary[key] = pendingRequest;

        try {
            return await pendingRequest;
        } finally {
            delete this.dictionary[key];
        }
    }
}
