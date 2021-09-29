import BigNumber from 'bignumber.js';

export class PairAbiServiceMock {
    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<BigNumber> {
        return new BigNumber(100);
    }
}
