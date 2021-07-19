import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { GenericEsdtAmountPair } from '../models/proxy.model';
import { ContextService } from '../../../services/context/context.service';
import { NftCollection } from '../../../models/tokens/nftCollection.model';
import { RedisCacheService } from '../../../services/redis-cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as Redis from 'ioredis';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { cacheConfig } from '../../../config';

@Injectable()
export class ProxyPairService {
    private redisClient: Redis.Redis;

    constructor(
        private abiService: AbiProxyPairService,
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
            const cacheKey = this.getProxyPairCacheKey(tokenCacheKey);
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
                    path: 'ProxyPairService.getTokenID',
                },
            );
        }
    }

    async getwrappedLpTokenID(): Promise<string> {
        return this.getTokenID('wrappedLpTokenID', () =>
            this.abiService.getWrappedLpTokenID(),
        );
    }

    async getwrappedLpToken(): Promise<NftCollection> {
        const wrappedLpTokenID = await this.getwrappedLpTokenID();
        return await this.context.getNftCollectionMetadata(wrappedLpTokenID);
    }

    async getIntermediatedPairs(): Promise<string[]> {
        try {
            const cacheKey = this.getProxyPairCacheKey('intermediatedPairs');
            const getIntermediatedPairs = () =>
                this.abiService.getIntermediatedPairsAddress();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getIntermediatedPairs,
                cacheConfig.default,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get proxy intermediated pairs`,
                error,
                {
                    path: 'ProxyPairService.getIntermediatedPairs',
                },
            );
        }
    }

    async getTemporaryFundsProxy(
        userAddress: string,
    ): Promise<GenericEsdtAmountPair[]> {
        return this.abiService.getTemporaryFundsProxy(userAddress);
    }

    private getProxyPairCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxyPair', args);
    }
}
