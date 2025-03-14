import { Injectable, Scope } from '@nestjs/common';
import { TokenComputeService } from './token.compute.service';
import { CacheService } from 'src/services/caching/cache.service';
import DataLoader from 'dataloader';
import { getAllKeys } from 'src/utils/get.many.utils';
import { TokenService } from './token.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable({
    scope: Scope.REQUEST,
})
export class TokenLoader {
    constructor(
        private readonly tokenService: TokenService,
        private readonly tokenCompute: TokenComputeService,
        private readonly cacheService: CacheService,
    ) {}

    public readonly tokenTypeLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return this.tokenService.getAllEsdtTokensType(tokenIDs);
        },
        {
            cache: false,
        },
    );

    public readonly tokenPriceDerivedEGLDLoader = new DataLoader<
        string,
        string
    >(
        async (tokenIDs: string[]) => {
            return this.tokenCompute.getAllTokensPriceDerivedEGLD(tokenIDs);
        },
        {
            cache: false,
        },
    );

    public readonly tokenPriceDerivedUSDLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return this.tokenCompute.getAllTokensPriceDerivedUSD(tokenIDs);
        },
        {
            cache: false,
        },
    );

    public readonly tokenPrevious24hPriceLoader = new DataLoader<
        string,
        string
    >(
        async (tokenIDs: string[]) => {
            return this.tokenCompute.getAllTokensPrevious24hPrice(tokenIDs);
        },
        {
            cache: false,
        },
    );

    public readonly tokenPrevious7dPriceLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return this.tokenCompute.getAllTokensPrevious7dPrice(tokenIDs);
        },
        {
            cache: false,
        },
    );

    public readonly tokenVolumeUSD24hLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return this.tokenCompute.getAllTokensVolumeUSD24h(tokenIDs);
        },
        {
            cache: false,
        },
    );

    public readonly tokenPrevious24hVolumeUSDLoader = new DataLoader<
        string,
        string
    >(
        async (tokenIDs: string[]) => {
            return this.tokenCompute.getAllTokensPrevious24hVolumeUSD(tokenIDs);
        },
        {
            cache: false,
        },
    );

    public readonly tokenLiquidityUSDLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return this.tokenCompute.getAllTokensLiquidityUSD(tokenIDs);
        },
        {
            cache: false,
        },
    );

    public readonly tokenCreatedAtLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return this.tokenCompute.getAllTokensCreatedAt(tokenIDs);
        },
        {
            cache: false,
        },
    );

    public readonly tokenSwapCountLoader = new DataLoader<string, number>(
        async (tokenIDs: string[]) => {
            return getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.tokenSwapCount',
                this.tokenCompute.tokenSwapCount.bind(this.tokenCompute),
                CacheTtlInfo.Token,
            );
        },
        {
            cache: false,
        },
    );

    public readonly tokenPrevious24hSwapCountLoader = new DataLoader<
        string,
        number
    >(
        async (tokenIDs: string[]) => {
            return getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.tokenPrevious24hSwapCount',
                this.tokenCompute.tokenPrevious24hSwapCount.bind(
                    this.tokenCompute,
                ),
                CacheTtlInfo.Token,
            );
        },
        {
            cache: false,
        },
    );

    public readonly tokenTrendingScoreLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return this.tokenCompute.getAllTokensTrendingScore(tokenIDs);
        },
        {
            cache: false,
        },
    );
}
