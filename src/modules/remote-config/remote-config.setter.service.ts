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
import { RemoteConfigGetterService } from './remote-config.getter.service';

@Injectable()
export class RemoteConfigSetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        private readonly getterService: RemoteConfigGetterService,
    ) {}

    private async setData(
        cacheKey: string,
        value: any,
        ttl: number = cacheConfig.default,
    ): Promise<string> {
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
        const cacheKey = await this.getFlagCacheKey(name);
        return await this.setData(cacheKey, value, oneHour());
    }

    async setSCAddresses(
        cacheKey: string,
        addresses: string[],
    ): Promise<string> {
        await this.setData(cacheKey, addresses, oneHour());
        await this.deleteCacheKeys([cacheKey]);
        return cacheKey;
    }

    async addSCAddress(
        newAddress: string,
        category: SCAddressType,
    ): Promise<string> {
        const cacheKey = await this.getSCAddressCacheKey(category);
        const addresses = await this.getterService.getSCAddresses(
            cacheKey,
            category,
        );
        return await this.setSCAddresses(
            cacheKey,
            addresses.concat(newAddress),
        );
    }

    async removeSCAddress(
        oldAddress: string,
        category: SCAddressType,
    ): Promise<string> {
        const cacheKey = await this.getSCAddressCacheKey(category);
        const addresses = await this.getterService.getSCAddresses(
            cacheKey,
            category,
        );
        const index = addresses.indexOf(oldAddress);
        return await this.setSCAddresses(cacheKey, addresses.slice(index, 1));
    }

    async deleteFlag(name: string): Promise<void> {
        const cacheKey = await this.getFlagCacheKey(name);
        await this.cachingService.delete(cacheKey);
        await this.deleteCacheKeys([cacheKey]);
    }

    async deleteSCAddresses(category: SCAddressType): Promise<void> {
        const cacheKey = this.getSCAddressCacheKey(category);
        await this.cachingService.delete(cacheKey);
        await this.deleteCacheKeys([cacheKey]);
    }

    private getSCAddressCacheKey(category: SCAddressType, ...args: any) {
        return generateCacheKeyFromParams('scAddress', category, ...args);
    }

    private getFlagCacheKey(flagName: string, ...args: any) {
        return generateCacheKeyFromParams('flag', flagName, ...args);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]): Promise<void> {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
