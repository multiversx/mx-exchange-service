import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairService } from './pair.service';

@Injectable()
export class PairAnalyticsService {
    constructor(private readonly pairService: PairService) {}

    async getFirstTokenValueLocked(pairAddress: string): Promise<string> {
        const reserves = await this.pairService.getPairInfoMetadata(
            pairAddress,
        );
        return reserves.reserves0;
    }

    async getSecondTokenValueLocked(pairAddress: string): Promise<string> {
        const reserves = await this.pairService.getPairInfoMetadata(
            pairAddress,
        );
        return reserves.reserves1;
    }

    async getFirstTokenValueLockedUSD(pairAddress: string): Promise<string> {
        const [firstToken, firstTokenPriceUSD, reserves] = await Promise.all([
            this.pairService.getFirstToken(pairAddress),
            this.pairService.getFirstTokenPriceUSD(pairAddress),
            this.pairService.getPairInfoMetadata(pairAddress),
        ]);

        return new BigNumber(reserves.reserves0)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .multipliedBy(firstTokenPriceUSD)
            .toFixed();
    }

    async getSecondTokenValueLockedUSD(pairAddress: string): Promise<string> {
        const [secondToken, secondTokenPriceUSD, reserves] = await Promise.all([
            this.pairService.getSecondToken(pairAddress),
            this.pairService.getSecondTokenPriceUSD(pairAddress),
            this.pairService.getPairInfoMetadata(pairAddress),
        ]);

        return new BigNumber(reserves.reserves1)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .multipliedBy(secondTokenPriceUSD)
            .toFixed();
    }

    async getPairLockedValueUSD(pairAddress: string): Promise<string> {
        const [
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
        ] = await Promise.all([
            this.getFirstTokenValueLockedUSD(pairAddress),
            this.getSecondTokenValueLockedUSD(pairAddress),
        ]);

        return new BigNumber(firstTokenLockedValueUSD)
            .plus(secondTokenLockedValueUSD)
            .toFixed();
    }
}
