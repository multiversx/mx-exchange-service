import { Injectable, Scope } from '@nestjs/common';
import { FarmComputeService } from './farm.compute.service';
import DataLoader from 'dataloader';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { getAllKeys } from 'src/utils/get.many.utils';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmComputeLoader {
    constructor(
        protected readonly farmCompute: FarmComputeService,
        protected readonly cacheService: CacheService,
    ) {}

    public readonly farmLockedValueUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'farm.farmLockedValueUSD',
                this.farmCompute.farmLockedValueUSD.bind(this.farmCompute),
            );
        },
    );

    public readonly farmedTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'farm.farmedTokenPriceUSD',
                this.farmCompute.farmedTokenPriceUSD.bind(this.farmCompute),
            );
        },
    );

    public readonly farmingTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'farm.farmingTokenPriceUSD',
                this.farmCompute.farmingTokenPriceUSD.bind(this.farmCompute),
            );
        },
    );
}
