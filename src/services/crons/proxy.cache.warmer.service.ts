import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AbiProxyService } from 'src/modules/proxy/services/proxy-abi.service';
import { AbiProxyPairService } from 'src/modules/proxy/services/proxy-pair/proxy-pair-abi.service';
import { AbiProxyFarmService } from 'src/modules/proxy/services/proxy-farm/proxy-farm-abi.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import { cacheConfig } from 'src/config';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { oneHour } from '../../helpers/helpers';

@Injectable()
export class ProxyCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abiProxyService: AbiProxyService,
        private readonly abiProxyPairService: AbiProxyPairService,
        private readonly abiProxyFarmService: AbiProxyFarmService,
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async cacheProxy(): Promise<void> {
        const [
            assetTokenID,
            lockedAssetTokenID,
            wrappedLpTokenID,
            intermediatedPairs,
            wrappedFarmTokenID,
            intermediatedFarms,
        ] = await Promise.all([
            this.abiProxyService.getAssetTokenID(),
            this.abiProxyService.getLockedAssetTokenID(),
            this.abiProxyPairService.getWrappedLpTokenID(),
            this.abiProxyPairService.getIntermediatedPairsAddress(),
            this.abiProxyFarmService.getWrappedFarmTokenID(),
            this.abiProxyFarmService.getIntermediatedFarmsAddress(),
        ]);

        const [
            assetToken,
            lockedAssetToken,
            wrappedLpToken,
            wrappedFarmToken,
        ] = await Promise.all([
            this.apiService.getToken(assetTokenID),
            this.apiService.getNftCollection(lockedAssetTokenID),
            this.apiService.getNftCollection(wrappedLpTokenID),
            this.apiService.getNftCollection(wrappedFarmTokenID),
        ]);

        await Promise.all([
            this.setProxyCache(
                'proxy',
                'assetTokenID',
                assetTokenID,
                oneHour(),
            ),
            this.setProxyCache(
                'proxy',
                'lockedAssetTokenID',
                lockedAssetTokenID,
                oneHour(),
            ),
            this.setProxyCache(
                'proxyPair',
                'wrappedLpTokenID',
                wrappedLpTokenID,
                oneHour(),
            ),
            this.setProxyCache(
                'proxyPair',
                'intermediatedPairs',
                intermediatedPairs,
                oneHour(),
            ),
            this.setProxyCache(
                'proxyFarm',
                'wrappedFarmTokenID',
                wrappedFarmTokenID,
                oneHour(),
            ),
            this.setProxyCache(
                'proxyFarm',
                'intermediatedFarms',
                intermediatedFarms,
                oneHour(),
            ),
            this.setContextCache(assetTokenID, assetToken, oneHour()),
            this.setContextCache(
                lockedAssetTokenID,
                lockedAssetToken,
                oneHour(),
            ),
            this.setContextCache(wrappedLpTokenID, wrappedLpToken, oneHour()),
            this.setContextCache(
                wrappedFarmTokenID,
                wrappedFarmToken,
                oneHour(),
            ),
        ]);
        await this.deleteCacheKeys();
    }

    private async setProxyCache(
        proxy: string,
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams(proxy, key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        this.invalidatedKeys.push(cacheKey);
    }

    private async setContextCache(
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams('context', key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        this.invalidatedKeys.push(cacheKey);
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
