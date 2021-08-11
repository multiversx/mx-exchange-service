import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AbiProxyService } from 'src/modules/proxy/proxy-abi.service';
import { AbiProxyPairService } from 'src/modules/proxy/proxy-pair/proxy-pair-abi.service';
import { AbiProxyFarmService } from 'src/modules/proxy/proxy-farm/proxy-farm-abi.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import { cacheConfig } from 'src/config';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class ProxyCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abiProxyService: AbiProxyService,
        private readonly abiProxyPairService: AbiProxyPairService,
        private readonly abiProxyFarmService: AbiProxyFarmService,
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        @Inject('PUBSUB_SERVICE') private readonly client: ClientProxy,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
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
            this.apiService.getService().getESDTToken(assetTokenID),
            this.apiService.getNftCollection(lockedAssetTokenID),
            this.apiService.getNftCollection(wrappedLpTokenID),
            this.apiService.getNftCollection(wrappedFarmTokenID),
        ]);

        await Promise.all([
            this.setProxyCache(
                'proxy',
                'assetTokenID',
                assetTokenID,
                cacheConfig.token,
            ),
            this.setProxyCache(
                'proxy',
                'lockedAssetTokenID',
                lockedAssetTokenID,
                cacheConfig.token,
            ),
            this.setProxyCache(
                'proxyPair',
                'wrappedLpTokenID',
                wrappedLpTokenID,
                cacheConfig.token,
            ),
            this.setProxyCache(
                'proxyPair',
                'intermediatedPairs',
                intermediatedPairs,
            ),
            this.setProxyCache(
                'proxyFarm',
                'wrappedFarmTokenID',
                wrappedFarmTokenID,
                cacheConfig.token,
            ),
            this.setProxyCache(
                'proxyFarm',
                'intermediatedFarms',
                intermediatedFarms,
            ),
            this.setContextCache(assetTokenID, assetToken, cacheConfig.token),
            this.setContextCache(
                lockedAssetTokenID,
                lockedAssetToken,
                cacheConfig.token,
            ),
            this.setContextCache(
                wrappedLpTokenID,
                wrappedLpToken,
                cacheConfig.token,
            ),
            this.setContextCache(
                wrappedFarmTokenID,
                wrappedFarmToken,
                cacheConfig.token,
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
        await this.client.emit('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
