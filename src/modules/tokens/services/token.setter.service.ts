import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { EsdtToken } from '../models/esdtToken.model';
import { NftCollection } from '../models/nftCollection.model';

@Injectable()
export class TokenSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setTokenMetadata(tokenID: string, value: EsdtToken): Promise<string> {
        const cacheKey = this.getTokenCacheKey(tokenID);
        return await this.setData(
            cacheKey,
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setNftCollectionMetadata(
        collection: string,
        value: NftCollection,
    ): Promise<string> {
        const cacheKey = this.getTokenCacheKey(collection);
        return await this.setData(
            cacheKey,
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setEsdtTokenType(tokenID: string, type: string): Promise<string> {
        return await this.setData(
            this.getTokenCacheKey(tokenID, 'type'),
            type,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setDerivedEGLD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            this.getTokenCacheKey(tokenID, 'derivedEGLD'),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setDerivedUSD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            this.getTokenCacheKey(tokenID, 'derivedUSD'),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setVolumeLast2Days(
        tokenID: string,
        value: { current: string; previous: string },
    ): Promise<string> {
        return await this.setData(
            `token.tokenLast2DaysVolumeUSD.${tokenID}`,
            value,
            CacheTtlInfo.TokenAnalytics.remoteTtl,
            CacheTtlInfo.TokenAnalytics.localTtl,
        );
    }

    async setPricePrevious24h(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            `token.tokenPrevious24hPrice.${tokenID}`,
            value,
            CacheTtlInfo.TokenAnalytics.remoteTtl,
            CacheTtlInfo.TokenAnalytics.localTtl,
        );
    }

    async setPricePrevious7d(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            `token.tokenPrevious7dPrice.${tokenID}`,
            value,
            CacheTtlInfo.TokenAnalytics.remoteTtl,
            CacheTtlInfo.TokenAnalytics.localTtl,
        );
    }

    async setLiquidityUSD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            `token.tokenLiquidityUSD.${tokenID}`,
            value,
            CacheTtlInfo.TokenAnalytics.remoteTtl,
            CacheTtlInfo.TokenAnalytics.localTtl,
        );
    }

    async setAllTokensSwapsCount(
        value: { tokenID: string; swapsCount: number }[],
    ): Promise<string> {
        return await this.setData(
            'token.allTokensSwapsCount',
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setAllTokensPrevious24hSwapsCount(
        value: { tokenID: string; swapsCount: number }[],
    ): Promise<string> {
        return await this.setData(
            'token.allTokensSwapsCountPrevious24h',
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setTrendingScore(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            `token.tokenTrendingScore.${tokenID}`,
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setMetadata(tokenID: string, value: EsdtToken): Promise<string> {
        return await this.setData(
            `token.tokenMetadata.${tokenID}`,
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setCreatedAt(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            `token.tokenCreatedAt.${tokenID}`,
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    private getTokenCacheKey(tokenID: string, ...args: any): string {
        return generateCacheKeyFromParams('token', tokenID, args);
    }
}
