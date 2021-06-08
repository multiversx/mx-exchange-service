import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { cacheConfig } from '../../config';

const Keys = {
    networkConfig: () => 'networkConfig',
    pairsMetadata: () => 'pairsMetadata',
    pairs: () => 'pairs',
    pairCount: () => 'pairCount',
    totalTxCount: () => 'totalTxCount',
    token: (tokenID: string) => `token.${tokenID}`,
};

const FactoryKeys = {
    pairsAddress: () => 'pairsAddress',
};

@Injectable()
export class CacheManagerService {
    constructor(
        @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache,
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

    async get(key: string): Promise<any> {
        return this.cacheManager.get(key);
    }

    async set(key: string, value: any, ttl: number) {
        if (!value) {
            return;
        }

        if (ttl <= -1) {
            return this.cacheManager.set(key, value);
        } else {
            return this.cacheManager.set(key, value, { ttl });
        }
    }
}
