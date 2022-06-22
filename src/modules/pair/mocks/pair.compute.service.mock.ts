// computeLockedValueUSD
import BigNumber from 'bignumber.js';
import { PairGetterServiceMock } from './pair.getter.service.mock';

export class PairComputeServiceMock {
    constructor(private readonly pairGetterService: PairGetterServiceMock) {}

    async computeFirstTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        const [
            firstToken,
            firstTokenPriceUSD,
            firstTokenReserve,
        ] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getFirstTokenPriceUSD(pairAddress),
            this.pairGetterService.getFirstTokenReserve(pairAddress),
        ]);

        return new BigNumber(firstTokenReserve)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .multipliedBy(firstTokenPriceUSD);
    }

    async computeSecondTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        const [
            secondToken,
            secondTokenPriceUSD,
            secondTokenReserve,
        ] = await Promise.all([
            this.pairGetterService.getSecondToken(pairAddress),
            this.pairGetterService.getSecondTokenPriceUSD(pairAddress),
            this.pairGetterService.getSecondTokenReserve(pairAddress),
        ]);

        return new BigNumber(secondTokenReserve)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .multipliedBy(secondTokenPriceUSD);
    }

    async computeLockedValueUSD(pairAddress: string): Promise<BigNumber> {
        const [
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
        ] = await Promise.all([
            this.computeFirstTokenLockedValueUSD(pairAddress),
            this.computeSecondTokenLockedValueUSD(pairAddress),
        ]);

        return new BigNumber(firstTokenLockedValueUSD).plus(
            secondTokenLockedValueUSD,
        );
    }
}
