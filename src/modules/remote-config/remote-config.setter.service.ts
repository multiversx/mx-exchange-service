import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheService } from 'src/services/caching/cache.service';
import { SCAddressRepositoryService } from 'src/services/database/repositories/scAddress.repository';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { SCAddressType } from './models/sc-address.model';
@Injectable()
export class RemoteConfigSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        private readonly scAddressRepositoryService: SCAddressRepositoryService,
    ) {
        super(cachingService, logger);
    }

    async setFlag(name: string, value: boolean): Promise<string> {
        return await this.setData(
            this.getFlagCacheKey(name),
            value,
            Constants.oneHour(),
        );
    }

    async setSCAddresses(
        cacheKey: string,
        addresses: string[],
    ): Promise<string> {
        await this.setData(cacheKey, addresses, Constants.oneHour());
        await this.deleteCacheKeys([cacheKey]);
        return cacheKey;
    }

    async setSCAddressesFromDB(category: SCAddressType): Promise<string> {
        const [cacheKey, addresses] = await Promise.all([
            this.getSCAddressCacheKey(category),
            this.scAddressRepositoryService.find({
                category: category,
            }),
        ]);
        return await this.setSCAddresses(
            cacheKey,
            addresses.map((a) => a.address),
        );
    }

    async setAnalytics(name: string, value: string): Promise<string> {
        return await this.setData(
            this.getAnalyticsCacheKey(name),
            value,
            Constants.oneHour(),
        );
    }

    async deleteFlag(name: string): Promise<void> {
        const cacheKey = this.getFlagCacheKey(name);
        await this.cachingService.deleteInCache(cacheKey);
        await this.deleteCacheKeys([cacheKey]);
    }

    async deleteSCAddresses(category: SCAddressType): Promise<void> {
        const cacheKey = this.getSCAddressCacheKey(category);
        await this.cachingService.deleteInCache(cacheKey);
        await this.deleteCacheKeys([cacheKey]);
    }

    private getSCAddressCacheKey(category: SCAddressType, ...args: any) {
        return generateCacheKeyFromParams('scAddress', category, ...args);
    }

    private getFlagCacheKey(flagName: string, ...args: any) {
        return generateCacheKeyFromParams('flag', flagName, ...args);
    }

    private getAnalyticsCacheKey(flagName: string, ...args: any) {
        return generateCacheKeyFromParams('analytics', flagName, ...args);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]): Promise<void> {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
