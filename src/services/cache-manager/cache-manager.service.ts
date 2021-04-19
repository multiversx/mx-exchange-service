import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { cacheConfig } from '../../config';

const Keys = {
    networkConfig: () => 'networkConfig',
    pairsMetadata: () => 'pairsMetadata',
    pairs: () => 'pairs',
};

@Injectable()
export class CacheManagerService {
    constructor(
        @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache
    ) { }

    async getNetworkConfig(): Promise<Record<string, any>> {
        return this.cacheManager.get(Keys.networkConfig());
    }

    async setNetworkConfig(networkConfig: Record<string, any>): Promise<void> {
        await this.set(Keys.networkConfig(), networkConfig, cacheConfig.networkConfig);
    }

    async getPairsMetadata(): Promise<Record<string, any>> {
        return this.cacheManager.get(Keys.pairsMetadata());
    }

    async setPairsMetadata(pairs: Record<string, any>): Promise<void> {
        await this.set(Keys.pairsMetadata(), pairs, cacheConfig.pairsMetadata);
    }

        return this.cacheManager.get(Keys.pairs());
    }

    async setAllPairs(pairs: Record<string, any>): Promise<void> {
        await this.set(Keys.pairs(), pairs, cacheConfig.pairs);
    }

    private async set(key: string, value: any, ttl: number) {
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