import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AbiProxyService } from 'src/modules/proxy/proxy-abi.service';
import { AbiProxyPairService } from 'src/modules/proxy/proxy-pair/proxy-pair-abi.service';
import { AbiProxyFarmService } from 'src/modules/proxy/proxy-farm/proxy-farm-abi.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { RedisCacheService } from '../redis-cache.service';
import { cacheConfig } from 'src/config';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';

@Injectable()
export class ProxyCacheWarmerService {
    constructor(
        private readonly abiProxyService: AbiProxyService,
        private readonly abiProxyPairService: AbiProxyPairService,
        private readonly abiProxyFarmService: AbiProxyFarmService,
        private readonly apiService: ElrondApiService,
        private readonly redisCacheService: RedisCacheService,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
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

        let cacheKey = generateCacheKeyFromParams('proxy', 'assetTokenID');
        this.redisCacheService.set(
            this.redisCacheService.getClient(),
            cacheKey,
            assetTokenID,
            cacheConfig.token,
        );
        cacheKey = generateCacheKeyFromParams('proxy', 'lockedAssetTokenID');
        this.redisCacheService.set(
            this.redisCacheService.getClient(),
            cacheKey,
            lockedAssetTokenID,
            cacheConfig.token,
        );
        cacheKey = generateCacheKeyFromParams('proxyPair', 'wrappedLpTokenID');
        this.redisCacheService.set(
            this.redisCacheService.getClient(),
            cacheKey,
            wrappedLpTokenID,
            cacheConfig.token,
        );
        cacheKey = generateCacheKeyFromParams(
            'proxyFarm',
            'intermediatedPairs',
        );
        this.redisCacheService.set(
            this.redisCacheService.getClient(),
            cacheKey,
            intermediatedPairs,
            cacheConfig.default,
        );
        cacheKey = generateCacheKeyFromParams(
            'proxyFarm',
            'wrappedFarmTokenID',
        );
        this.redisCacheService.set(
            this.redisCacheService.getClient(),
            cacheKey,
            wrappedFarmTokenID,
            cacheConfig.token,
        );
        cacheKey = generateCacheKeyFromParams(
            'proxyFarm',
            'intermediatedFarms',
        );
        this.redisCacheService.set(
            this.redisCacheService.getClient(),
            cacheKey,
            intermediatedFarms,
            cacheConfig.default,
        );

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

        cacheKey = generateCacheKeyFromParams('context', assetTokenID);
        this.redisCacheService.set(
            this.redisCacheService.getClient(),
            cacheKey,
            assetToken,
            cacheConfig.token,
        );
        cacheKey = generateCacheKeyFromParams('context', lockedAssetTokenID);
        this.redisCacheService.set(
            this.redisCacheService.getClient(),
            cacheKey,
            lockedAssetToken,
            cacheConfig.token,
        );
        cacheKey = generateCacheKeyFromParams('context', wrappedLpTokenID);
        this.redisCacheService.set(
            this.redisCacheService.getClient(),
            cacheKey,
            wrappedLpToken,
            cacheConfig.token,
        );
        cacheKey = generateCacheKeyFromParams('context', wrappedFarmTokenID);
        this.redisCacheService.set(
            this.redisCacheService.getClient(),
            cacheKey,
            wrappedFarmToken,
            cacheConfig.token,
        );
    }
}
