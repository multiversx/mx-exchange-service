import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairComputeService } from '../pair/services/pair.compute.service';
import { RouterGetterService } from './router.getter.service';

@Injectable()
export class RouterComputeService {
    constructor(
        @Inject(forwardRef(() => RouterGetterService))
        private readonly routerGetterService: RouterGetterService,
        private readonly pairComputeService: PairComputeService,
    ) {}

    async computeTotalLockedValueUSD(): Promise<BigNumber> {
        const pairsAddress = await this.routerGetterService.getAllPairsAddress();
        let totalValueLockedUSD = new BigNumber(0);
        const promises = pairsAddress.map(pairAddress =>
            this.pairComputeService.computeLockedValueUSD(pairAddress),
        );

        const pairsLockedValueUSD = await Promise.all(promises);

        for (const lockedValueUSD of pairsLockedValueUSD) {
            totalValueLockedUSD = totalValueLockedUSD.plus(lockedValueUSD);
        }

        return totalValueLockedUSD;
    }
}
