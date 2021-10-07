import BigNumber from 'bignumber.js';

export class PriceFeedServiceMock {
    async getTokenPrice(tokenName: string): Promise<BigNumber> {
        return new BigNumber(100);
    }
}
