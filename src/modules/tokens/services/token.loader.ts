import { Injectable, Scope } from '@nestjs/common';
import { TokenComputeService } from './token.compute.service';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
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
            return await this.tokenService.getAllEsdtTokensType(tokenIDs);
        },
    );

    public readonly tokenPriceDerivedEGLDLoader = new DataLoader<
        string,
        string
    >(async (tokenIDs: string[]) => {
        return await this.tokenCompute.getAllTokensPriceDerivedEGLD(tokenIDs);
    });

    public readonly tokenPriceDerivedUSDLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await this.tokenCompute.getAllTokensPriceDerivedUSD(
                tokenIDs,
            );
        },
    );

    public readonly tokenPrevious24hPriceLoader = new DataLoader<
        string,
        string
    >(async (tokenIDs: string[]) => {
        return await this.tokenCompute.getAllTokensPrevious24hPrice(tokenIDs);
    });

    public readonly tokenPrevious7dPriceLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await this.tokenCompute.getAllTokensPrevious7dPrice(
                tokenIDs,
            );
        },
    );

    public readonly tokenVolumeUSD24hLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await this.tokenCompute.getAllTokensVolumeUSD24h(tokenIDs);
        },
    );

    public readonly tokenPrevious24hVolumeUSDLoader = new DataLoader<
        string,
        string
    >(async (tokenIDs: string[]) => {
        return await this.tokenCompute.getAllTokensPrevious24hVolumeUSD(
            tokenIDs,
        );
    });

    public readonly tokenLiquidityUSDLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await this.tokenCompute.getAllTokensLiquidityUSD(tokenIDs);
        },
    );

    public readonly tokenCreatedAtLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await this.tokenCompute.getAllTokensCreatedAt(tokenIDs);
        },
    );

    public readonly tokenSwapCountLoader = new DataLoader<string, number>(
        async (tokenIDs: string[]) => {
            return await getAllKeys(
                this.cacheService,
                tokenIDs,
                'token.tokenSwapCount',
                this.tokenCompute.tokenSwapCount.bind(this.tokenCompute),
                CacheTtlInfo.Token,
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
            CacheTtlInfo.Token,
        );
    });

    public readonly tokenTrendingScoreLoader = new DataLoader<string, string>(
        async (tokenIDs: string[]) => {
            return await this.tokenCompute.getAllTokensTrendingScore(tokenIDs);
        },
    );
}
