export type TrackedToken = {
    decimals: number;
    priceUSD: string;
};

export class EventsBatchContext {
    private readonly tokens = new Map<string, TrackedToken>();

    trackTokenLockedValue(
        tokenID: string,
        decimals: number,
        priceUSD: string,
    ): void {
        this.tokens.set(tokenID, { decimals, priceUSD });
    }

    hasTrackedTokens(): boolean {
        return this.tokens.size > 0;
    }

    trackedTokens(): [string, TrackedToken][] {
        return [...this.tokens.entries()];
    }
}
