import { Injectable, Scope } from '@nestjs/common';
import { PairComputeService } from './pair.compute.service';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { getAllKeys } from 'src/utils/get.many.utils';
import DataLoader from 'dataloader';

@Injectable({
    scope: Scope.REQUEST,
})
export class PairComputeLoader {
    constructor(
        private readonly pairCompute: PairComputeService,
        private readonly cacheService: CacheService,
    ) {}

    public readonly firstTokenPriceLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.firstTokenPrice',
                this.pairCompute.firstTokenPrice.bind(this.pairCompute),
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
            );
        },
    );

    public readonly firstTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.firstTokenPriceUSD',
                this.pairCompute.firstTokenPriceUSD.bind(this.pairCompute),
            );
        },
    );

    public readonly secondTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.secondTokenPriceUSD',
                this.pairCompute.secondTokenPriceUSD.bind(this.pairCompute),
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
        );
    });

    public readonly lockedValueUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.lockedValueUSD',
                this.pairCompute.lockedValueUSD.bind(this.pairCompute),
            );
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
        );
    });

    public readonly previous24hVolumeUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.previous24hVolumeUSD',
                this.pairCompute.previous24hVolumeUSD.bind(this.pairCompute),
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
            );
        },
    );

    public readonly hasFarmsLoader = new DataLoader<string, boolean>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.hasFarms',
                this.pairCompute.hasFarms.bind(this.pairCompute),
            );
        },
    );

    public readonly hasDualFarmsLoader = new DataLoader<string, boolean>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.hasDualFarms',
                this.pairCompute.hasDualFarms.bind(this.pairCompute),
            );
        },
    );

    public readonly tradesCountLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.tradesCount',
                this.pairCompute.tradesCount.bind(this.pairCompute),
            );
        },
    );

    public readonly deployedAtLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return await getAllKeys(
                this.cacheService,
                addresses,
                'pair.deployedAt',
                this.pairCompute.deployedAt.bind(this.pairCompute),
            );
        },
    );
}
