export class PairAnalyticsServiceMock {
    async getFirstTokenValueLockedUSD(pairAddress: string): Promise<string> {
        return '500';
    }

    async getSecondTokenValueLockedUSD(pairAddress: string): Promise<string> {
        return '500';
    }

    async getPairLockedValueUSD(pairAddress: string): Promise<string> {
        return '1000';
    }
}
