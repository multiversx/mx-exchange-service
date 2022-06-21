import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from 'src/config';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { SCAddressType } from './models/sc-address.model';

@Injectable()
export class RemoteConfigSetterService {
    private invalidatedKeys = [];

    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    private async setData(
        name: string,
        value: any,
        ttl: number = cacheConfig.default,
    ): Promise<string> {
        const cacheKey = this.getFlagCacheKey(name);
        try {
            await this.cachingService.setCache(cacheKey, value, ttl);
            return cacheKey;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                RemoteConfigSetterService.name,
                '',
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async setFlag(name: string, value: boolean): Promise<string> {
        return await this.setData(name, value, oneHour());
    }

    async setStakingAddresses(
        addresses: string[],
        category: SCAddressType,
    ): Promise<string> {
        return await this.setData(category, addresses, oneHour());
    }

    async setStakingProxyAddresses(
        addresses: string[],
        category: SCAddressType,
    ): Promise<string> {
        return await this.setData(category, addresses, oneHour());
    }

    async deleteFlag(name: string): Promise<void> {
        const cacheKey = await this.getFlagCacheKey(name);
        this.invalidatedKeys.push(cacheKey);
        await Promise.all([
            this.cachingService.delete(cacheKey),
            this.deleteCacheKeys(),
        ]);
    }

    async deleteSCAddresses(category: SCAddressType): Promise<void> {
        const cacheKey = this.getSCAddressCacheKey(category)
        this.invalidatedKeys.push(cacheKey);
        await Promise.all([
            this.cachingService.delete(cacheKey),
            this.deleteCacheKeys(),
        ]);
    }

    private getSCAddressCacheKey(category: SCAddressType, ...args: any) {
        return generateCacheKeyFromParams('scAddress', category, ...args);
    }

    private getFlagCacheKey(flagName: string, ...args: any) {
        return generateCacheKeyFromParams('flag', flagName, ...args);
    }

    private async deleteCacheKeys(): Promise<void> {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
