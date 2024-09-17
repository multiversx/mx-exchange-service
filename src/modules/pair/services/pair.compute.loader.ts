import { Injectable, Scope } from '@nestjs/common';
import { PairComputeService } from './pair.compute.service';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { getAllKeys } from 'src/utils/get.many.utils';
import DataLoader from 'dataloader';
import { PairService } from './pair.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable({
    scope: Scope.REQUEST,
})
export class PairComputeLoader {
    constructor(
        private readonly pairCompute: PairComputeService,
        private readonly pairService: PairService,
        private readonly cacheService: CacheService,
    ) {}

    public readonly firstTokenPriceLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.firstTokenPrice',
                this.pairCompute.firstTokenPrice.bind(this.pairCompute),
                CacheTtlInfo.Price,
            );
        },
    );

    public readonly secondTokenPriceLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.secondTokenPrice',
                this.pairCompute.secondTokenPrice.bind(this.pairCompute),
                CacheTtlInfo.Price,
            );
        },
    );

    public readonly firstTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.pairCompute.getAllFirstTokensPriceUSD(addresses);
        },
    );

    public readonly secondTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.pairCompute.getAllSecondTokensPricesUSD(
                addresses,
            );
        },
    );

    public readonly lpTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.lpTokenPriceUSD',
                this.pairCompute.lpTokenPriceUSD.bind(this.pairCompute),
                CacheTtlInfo.Price,
            );
        },
    );

    public readonly firstTokenLockedValueUSDLoader = new DataLoader<
        string,
        string
    >(async (addresses: string[]) => {
        return await getAllKeys(
            this.cacheService,
            addresses,
            'pair.firstTokenLockedValueUSD',
            this.pairCompute.firstTokenLockedValueUSD.bind(this.pairCompute),
            CacheTtlInfo.ContractInfo,
        );
    });

    public readonly secondTokenLockedValueUSDLoader = new DataLoader<
        string,
        string
    >(async (addresses: string[]) => {
        return await getAllKeys(
            this.cacheService,
            addresses,
            'pair.secondTokenLockedValueUSD',
            this.pairCompute.secondTokenLockedValueUSD.bind(this.pairCompute),
            CacheTtlInfo.ContractInfo,
        );
    });

    public readonly lockedValueUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.pairService.getAllLockedValueUSD(addresses);
        },
    );

    public readonly previous24hLockedValueUSDLoader = new DataLoader<
        string,
        string
    >(async (addresses: string[]) => {
        return await getAllKeys(
            this.cacheService,
            addresses,
            'pair.previous24hLockedValueUSD',
            this.pairCompute.previous24hLockedValueUSD.bind(this.pairCompute),
            CacheTtlInfo.ContractInfo,
        );
    });

    public readonly previous24hVolumeUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.previous24hVolumeUSD',
                this.pairCompute.previous24hVolumeUSD.bind(this.pairCompute),
                CacheTtlInfo.Analytics,
            );
        },
    );

    public readonly previous24hFeesUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.previous24hFeesUSD',
                this.pairCompute.previous24hFeesUSD.bind(this.pairCompute),
                CacheTtlInfo.Analytics,
            );
        },
    );

    public readonly feesAPRLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.feesAPR',
                this.pairCompute.feesAPR.bind(this.pairCompute),
                CacheTtlInfo.ContractState,
            );
        },
    );

    public readonly typeLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.type',
                this.pairCompute.type.bind(this.pairCompute),
                CacheTtlInfo.ContractState,
            );
        },
    );

    public readonly hasFarmsLoader = new DataLoader<string, boolean>(
        async (addresses: string[]) => {
            return await this.pairService.getAllHasFarms(addresses);
        },
    );

    public readonly hasDualFarmsLoader = new DataLoader<string, boolean>(
        async (addresses: string[]) => {
            return await this.pairService.getAllHasDualFarms(addresses);
        },
    );

    public readonly tradesCountLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return await this.pairService.getAllTradesCount(addresses);
        },
    );

    public readonly deployedAtLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return await this.pairService.getAllDeployedAt(addresses);
        },
    );
}
