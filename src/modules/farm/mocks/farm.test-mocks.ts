export class PairServiceMock {
    async getTokenPriceUSD(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        return '100';
    }

    async getLpTokenPriceUSD(pairAddress): Promise<string> {
        return '200';
    }

    async computeTokenPriceUSD(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        return '100';
    }

    async getPairAddressByLpTokenID(tokenID: string): Promise<string> {
        return 'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww';
    }
}
