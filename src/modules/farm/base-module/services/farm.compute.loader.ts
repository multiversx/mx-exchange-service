import { Injectable, Scope } from '@nestjs/common';
import { FarmComputeService } from './farm.compute.service';
import DataLoader from 'dataloader';
import { CacheService } from 'src/services/caching/cache.service';
import { getAllKeys } from 'src/utils/get.many.utils';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

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
            return getAllKeys(
                this.cacheService,
                addresses,
                'farm.farmLockedValueUSD',
                this.farmCompute.farmLockedValueUSD.bind(this.farmCompute),
                CacheTtlInfo.ContractState,
            );
        },
    );

    public readonly farmedTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys(
                this.cacheService,
                addresses,
                'farm.farmedTokenPriceUSD',
                this.farmCompute.farmedTokenPriceUSD.bind(this.farmCompute),
                CacheTtlInfo.Price,
            );
        },
    );

    public readonly farmingTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys(
                this.cacheService,
                addresses,
                'farm.farmingTokenPriceUSD',
                this.farmCompute.farmingTokenPriceUSD.bind(this.farmCompute),
                CacheTtlInfo.Price,
            );
        },
    );
}
