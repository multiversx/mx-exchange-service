import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from '../../config';
import { Logger } from 'winston';

const Keys = {
    networkConfig: () => 'networkConfig',
    pairsMetadata: () => 'pairsMetadata',
    pairs: () => 'pairs',
    pairCount: () => 'pairCount',
    totalTxCount: () => 'totalTxCount',
    token: (tokenID: string) => `token.${tokenID}`,
    priceFeed: (tokenID: string) => `priceFeed.${tokenID}`,
    lastProcessedNonce: () => 'lastProcessedNonce',
};

const FactoryKeys = {
    pairsAddress: () => 'pairsAddress',
};

@Injectable()
export class CacheManagerService {
    constructor(
        @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {}

    async getPairsAddress(): Promise<Record<string, any>> {
        return this.cacheManager.get(FactoryKeys.pairsAddress());
    }

    async setPairsAddress(pairsAddress: Record<string, any>): Promise<void> {
        await this.set(
            FactoryKeys.pairsAddress(),
            pairsAddress,
            cacheConfig.pairsMetadata,
        );
    }

    async getPairsMetadata(): Promise<Record<string, any>> {
        return this.cacheManager.get(Keys.pairsMetadata());
    }

    async setPairsMetadata(pairs: Record<string, any>): Promise<void> {
        await this.cacheManager.set(
            Keys.pairsMetadata(),
            pairs,
            cacheConfig.pairsMetadata,
        );
    }

    async getPairCount(): Promise<Record<string, any>> {
        return this.cacheManager.get(Keys.pairCount());
    }

    async setPairCount(pairCount: Record<string, any>): Promise<void> {
        await this.set(Keys.pairCount(), pairCount, cacheConfig.pairCount);
    }

    async getTotalTxCount(): Promise<Record<string, any>> {
        return this.cacheManager.get(Keys.totalTxCount());
    }

    async setTotalTxCount(totalTxCount: Record<string, any>): Promise<void> {
        await this.set(
            Keys.totalTxCount(),
            totalTxCount,
            cacheConfig.txTotalCount,
        );
    }

    async getToken(tokenID: string): Promise<Record<string, any>> {
        return this.cacheManager.get(Keys.token(tokenID));
    }

    async setToken(tokenID: string, token: Record<string, any>): Promise<void> {
        await this.set(Keys.token(tokenID), token, cacheConfig.token);
    }

    async getPriceFeed(tokenID: string): Promise<Record<string, any>> {
        return this.get(Keys.priceFeed(tokenID));
    }

    async setPriceFeed(
        tokenID: string,
        priceFeed: Record<string, any>,
    ): Promise<void> {
        await this.set(
            Keys.priceFeed(tokenID),
            priceFeed,
            cacheConfig.priceFeed,
        );
    }

    async getLastProcessedNonce(): Promise<Record<string, any>> {
        return this.get(Keys.lastProcessedNonce());
    }

    async setLastProcessedNonce(
        lastProcessedNonce: Record<string, any>,
    ): Promise<void> {
        await this.set(
            Keys.lastProcessedNonce(),
            lastProcessedNonce,
            Number.MAX_SAFE_INTEGER,
        );
    }

    async get(key: string): Promise<any> {
        try {
            return this.cacheManager.get(key);
        } catch (error) {
            this.logger.error('An error occured while trying to get from redis cache.', {
                path: 'redis-cache.service.get',
                exception: error.toString(),
                cacheKey: key
            });
            return null;
        }
    }

    async set(key: string, value: any, ttl: number = cacheConfig.default): Promise<void> {
        if (isNil(value)) {
            return;
        }

        try {
            return this.cacheManager.set(key, value, { ttl });
        } catch (error) {
            this.logger.error('An error occurred while trying to set in redis cache.', {
                path: 'redis-cache.service.set',
                exception: error.toString(),
                cacheKey: key
            })
        }
    }
}
