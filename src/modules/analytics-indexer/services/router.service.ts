import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { IndexerPairService } from './pair.service';
import { GlobalState } from '../global.state';

@Injectable()
export class IndexerRouterService {
    constructor(private readonly pairService: IndexerPairService) {}

    public computeTotalLockedValueUSD(): BigNumber {
        const pairsAddress = this.getAllPairAddresses();

        let totalValueLockedUSD = new BigNumber(0);
        for (const pairAddress of pairsAddress) {
            const lockedValueUSDBig =
                this.pairService.computeLockedValueUSD(pairAddress);

            totalValueLockedUSD = !lockedValueUSDBig.isNaN()
                ? totalValueLockedUSD.plus(lockedValueUSDBig)
                : totalValueLockedUSD;
        }

        return totalValueLockedUSD;
    }

    private getAllPairAddresses(): string[] {
        const pairAddresses = [];
        for (const pairAddress in GlobalState.pairsState) {
            pairAddresses.push(pairAddress);
        }
        return pairAddresses;
    }
}
