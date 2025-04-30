import { Injectable, Scope } from '@nestjs/common';
import { PairComputeService } from './pair.compute.service';
import { CacheService } from 'src/services/caching/cache.service';
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
            return this.pairCompute.getAllFirstTokensPrice(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly secondTokenPriceLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return this.pairCompute.getAllSecondTokensPrice(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly firstTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return this.pairCompute.getAllFirstTokensPriceUSD(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly secondTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return this.pairCompute.getAllSecondTokensPricesUSD(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly lpTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys(
                this.cacheService,
                addresses,
                'pair.lpTokenPriceUSD',
                this.pairCompute.lpTokenPriceUSD.bind(this.pairCompute),
                CacheTtlInfo.Price,
            );
        },
        {
            cache: false,
        },
    );

    public readonly firstTokenLockedValueUSDLoader = new DataLoader<
        string,
        string
    >(
        async (addresses: string[]) => {
            return this.pairCompute.getAllFirstTokensLockedValueUSD(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly secondTokenLockedValueUSDLoader = new DataLoader<
        string,
        string
    >(
        async (addresses: string[]) => {
            return this.pairCompute.getAllSecondTokensLockedValueUSD(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly firstTokenVolumeLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return this.pairCompute.getAllFirstTokensVolume(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly secondTokenVolumeLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return this.pairCompute.getAllSecondTokensVolume(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly lockedValueUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return this.pairService.getAllLockedValueUSD(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly previous24hLockedValueUSDLoader = new DataLoader<
        string,
        string
    >(
        async (addresses: string[]) => {
            return getAllKeys(
                this.cacheService,
                addresses,
                'pair.previous24hLockedValueUSD',
                this.pairCompute.previous24hLockedValueUSD.bind(
                    this.pairCompute,
                ),
                CacheTtlInfo.ContractInfo,
            );
        },
        {
            cache: false,
        },
    );

    public readonly previous24hVolumeUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys(
                this.cacheService,
                addresses,
                'pair.previous24hVolumeUSD',
                this.pairCompute.previous24hVolumeUSD.bind(this.pairCompute),
                CacheTtlInfo.Analytics,
            );
        },
        {
            cache: false,
        },
    );

    public readonly volumeUSD24hLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return this.pairCompute.getAllVolumeUSD(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly previous24hFeesUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys(
                this.cacheService,
                addresses,
                'pair.previous24hFeesUSD',
                this.pairCompute.previous24hFeesUSD.bind(this.pairCompute),
                CacheTtlInfo.Analytics,
            );
        },
        {
            cache: false,
        },
    );

    public readonly feesAPRLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys(
                this.cacheService,
                addresses,
                'pair.feesAPR',
                this.pairCompute.feesAPR.bind(this.pairCompute),
                CacheTtlInfo.ContractState,
            );
        },
        {
            cache: false,
        },
    );

    public readonly typeLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys(
                this.cacheService,
                addresses,
                'pair.type',
                this.pairCompute.type.bind(this.pairCompute),
                CacheTtlInfo.ContractState,
            );
        },
        {
            cache: false,
        },
    );

    public readonly hasFarmsLoader = new DataLoader<string, boolean>(
        async (addresses: string[]) => {
            return this.pairService.getAllHasFarms(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly hasDualFarmsLoader = new DataLoader<string, boolean>(
        async (addresses: string[]) => {
            return this.pairService.getAllHasDualFarms(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly tradesCountLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return this.pairService.getAllTradesCount(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly tradesCount24hLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return this.pairCompute.getAllTradesCount24h(addresses);
        },
        {
            cache: false,
        },
    );

    public readonly deployedAtLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return this.pairService.getAllDeployedAt(addresses);
        },
        {
            cache: false,
        },
    );
}
