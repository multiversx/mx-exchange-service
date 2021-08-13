import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { GenericEsdtAmountPair } from '../models/proxy.model';
import { ContextService } from '../../../services/context/context.service';
import { NftCollection } from '../../../models/tokens/nftCollection.model';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as Redis from 'ioredis';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../../utils/generate-log-message';
import { oneHour } from '../../../helpers/helpers';

@Injectable()
export class ProxyPairService {
    private redisClient: Redis.Redis;

    constructor(
        private abiService: AbiProxyPairService,
        private context: ContextService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.redisClient = this.cachingService.getClient();
    }
    private async getTokenID(
        tokenCacheKey: string,
        createValueFunc: () => any,
    ): Promise<string> {
        const cacheKey = this.getProxyPairCacheKey(tokenCacheKey);
        try {
            return this.cachingService.getOrSet(
                this.redisClient,
                cacheKey,
                createValueFunc,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ProxyPairService.name,
                this.getTokenID.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
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
        const cacheKey = this.getProxyPairCacheKey('intermediatedPairs');
        try {
            const getIntermediatedPairs = () =>
                this.abiService.getIntermediatedPairsAddress();
            return this.cachingService.getOrSet(
                this.redisClient,
                cacheKey,
                getIntermediatedPairs,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ProxyPairService.name,
                this.getIntermediatedPairs.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getTemporaryFundsProxy(
        userAddress: string,
    ): Promise<GenericEsdtAmountPair[]> {
        return this.abiService.getTemporaryFundsProxy(userAddress);
    }

    private getProxyPairCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxyPair', ...args);
    }
}
