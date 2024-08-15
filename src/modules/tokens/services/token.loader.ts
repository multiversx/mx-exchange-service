import { Injectable, Scope } from '@nestjs/common';
import { TokenComputeService } from './token.compute.service';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import DataLoader from 'dataloader';
import { getAllKeys } from 'src/utils/get.many.utils';
import { TokenService } from './token.service';

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
            return await getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.getEsdtTokenType',
                this.tokenService.getEsdtTokenType.bind(this.tokenService),
            );
        },
    );

    public readonly tokenPriceDerivedEGLDLoader = new DataLoader<
        string,
        string
    >(async (tokenIDs: string[]) => {
        return await getAllKeys(
            this.cacheService,
            tokenIDs,
            'token.tokenPriceDerivedEGLD',
            this.tokenCompute.tokenPriceDerivedEGLD.bind(this.tokenCompute),
        );
    });

    public readonly tokenPriceDerivedUSDLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.tokenPriceDerivedUSD',
                this.tokenCompute.tokenPriceDerivedUSD.bind(this.tokenCompute),
            );
        },
    );

    public readonly tokenPrevious24hPriceLoader = new DataLoader<
        string,
        string
    >(async (tokenIDs: string[]) => {
        return await getAllKeys(
            this.cacheService,
            tokenIDs,
            'token.tokenPrevious24hPrice',
            this.tokenCompute.tokenPrevious24hPrice.bind(this.tokenCompute),
        );
    });

    public readonly tokenPrevious7dPriceLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.tokenPrevious7dPrice',
                this.tokenCompute.tokenPrevious7dPrice.bind(this.tokenCompute),
            );
        },
    );

    public readonly tokenVolumeUSD24hLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.tokenVolumeUSD24h',
                this.tokenCompute.tokenVolumeUSD24h.bind(this.tokenCompute),
            );
        },
    );

    public readonly tokenPrevious24hVolumeUSDLoader = new DataLoader<
        string,
        string
    >(async (tokenIDs: string[]) => {
        return await getAllKeys(
            this.cacheService,
            tokenIDs,
            'token.tokenPrevious24hVolumeUSD',
            this.tokenCompute.tokenPrevious24hVolumeUSD.bind(this.tokenCompute),
        );
    });

    public readonly tokenLiquidityUSDLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.tokenLiquidityUSD',
                this.tokenCompute.tokenLiquidityUSD.bind(this.tokenCompute),
            );
        },
    );

    public readonly tokenCreatedAtLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.tokenCreatedAt',
                this.tokenCompute.tokenCreatedAt.bind(this.tokenCompute),
            );
        },
    );

    public readonly tokenSwapCountLoader = new DataLoader<string, number>(
        async (tokenIDs: string[]) => {
            return await getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.tokenSwapCount',
                this.tokenCompute.tokenSwapCount.bind(this.tokenCompute),
            );
        },
    );

    public readonly tokenPrevious24hSwapCountLoader = new DataLoader<
        string,
        number
    >(async (tokenIDs: string[]) => {
        return await getAllKeys(
            this.cacheService,
            tokenIDs,
            'token.tokenPrevious24hSwapCount',
            this.tokenCompute.tokenPrevious24hSwapCount.bind(this.tokenCompute),
        );
    });

    public readonly tokenTrendingScoreLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.tokenTrendingScore',
                this.tokenCompute.tokenTrendingScore.bind(this.tokenCompute),
            );
        },
    );
}
