import { Inject, Injectable } from '@nestjs/common';
import { ContextService } from '../../../services/context/context.service';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { RedisCacheService } from 'src/services/redis-cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as Redis from 'ioredis';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { cacheConfig } from 'src/config';

@Injectable()
export class ProxyFarmService {
    private redisClient: Redis.Redis;
    constructor(
        private abiService: AbiProxyFarmService,
        private context: ContextService,
        private readonly redisCacheService: RedisCacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.redisClient = this.redisCacheService.getClient();
    }

    private async getTokenID(
        tokenCacheKey: string,
        createValueFunc: () => any,
    ): Promise<string> {
        try {
            const cacheKey = this.getProxyFarmCacheKey(tokenCacheKey);
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                createValueFunc,
                cacheConfig.token,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get ${tokenCacheKey}`,
                error,
                {
                    path: 'ProxyFarmService.getTokenID',
                },
            );
        }
    }

    async getwrappedFarmTokenID(): Promise<string> {
        return this.getTokenID('wrappedFarmTokenID', () =>
            this.abiService.getWrappedFarmTokenID(),
        );
    }

    async getwrappedFarmToken(): Promise<NftCollection> {
        const wrappedFarmTokenID = await this.getwrappedFarmTokenID();
        return this.context.getNftCollectionMetadata(wrappedFarmTokenID);
    }

    async getIntermediatedFarms(): Promise<string[]> {
        try {
            const cacheKey = this.getProxyFarmCacheKey('intermediatedFarms');
            const getIntermediatedFarms = () =>
                this.abiService.getIntermediatedFarmsAddress();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getIntermediatedFarms,
                cacheConfig.default,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get proxy intermediated farms`,
                error,
                {
                    path: 'ProxyFarmService.getIntermediatedFarms',
                },
            );
        }
    }

    private getProxyFarmCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxyFarm', args);
    }
}
