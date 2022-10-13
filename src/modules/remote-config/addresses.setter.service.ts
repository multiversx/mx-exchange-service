import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { SCAddressRepositoryService } from 'src/services/database/repositories/scAddress.repository';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { SCAddressType } from './models/sc-address.model';

@Injectable()
export class AddressesSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        @Inject(PUB_SUB) protected pubSub: RedisPubSub,
        private readonly scAddressRepositoryService: SCAddressRepositoryService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'scAddress'
    }

    async setSCAddresses(
        cacheKey: string,
        addresses: string[],
    ): Promise<string> {
        await this.setData(cacheKey, addresses, oneHour());
        await this.deleteCacheKeys(this.pubSub, [cacheKey]);
        return cacheKey;
    }

    async setSCAddressesFromDB(category: SCAddressType): Promise<string> {
        const [cacheKey, addresses] = await Promise.all([
            this.getCacheKey(category),
            this.scAddressRepositoryService.find({
                category: category,
            }),
        ]);
        return await this.setSCAddresses(
            cacheKey,
            addresses.map(a => a.address),
        );
    }

    async deleteSCAddresses(category: SCAddressType): Promise<void> {
        const cacheKey = this.getCacheKey(category);
        await this.cachingService.deleteInCache(cacheKey);
        await this.deleteCacheKeys(this.pubSub, [cacheKey]);
    }
}
