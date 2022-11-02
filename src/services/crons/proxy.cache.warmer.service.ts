import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AbiProxyService } from 'src/modules/proxy/services/proxy-abi.service';
import { AbiProxyPairService } from 'src/modules/proxy/services/proxy-pair/proxy-pair-abi.service';
import { AbiProxyFarmService } from 'src/modules/proxy/services/proxy-farm/proxy-farm-abi.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import { cacheConfig, scAddress } from 'src/config';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { oneHour } from '../../helpers/helpers';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { CacheTtlInfo } from '../caching/cache.ttl.info';

@Injectable()
export class ProxyCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abiProxyService: AbiProxyService,
        private readonly abiProxyPairService: AbiProxyPairService,
        private readonly abiProxyFarmService: AbiProxyFarmService,
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        private readonly tokenSetter: TokenSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async cacheProxy(): Promise<void> {
        for (const address of scAddress.proxyDexAddress) {
            const [
                assetTokenID,
                lockedAssetTokenID,
                wrappedLpTokenID,
                intermediatedPairs,
                wrappedFarmTokenID,
                intermediatedFarms,
            ] = await Promise.all([
                this.abiProxyService.getAssetTokenID(address),
                this.abiProxyService.getLockedAssetTokenID(address),
                this.abiProxyPairService.getWrappedLpTokenID(address),
                this.abiProxyPairService.getIntermediatedPairsAddress(address),
                this.abiProxyFarmService.getWrappedFarmTokenID(address),
                this.abiProxyFarmService.getIntermediatedFarmsAddress(address),
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
                    CacheTtlInfo.Token.remoteTtl,
                    CacheTtlInfo.Token.localTtl,
                ),
                this.setProxyCache(
                    'proxy',
                    'lockedAssetTokenID',
                    lockedAssetTokenID,
                    CacheTtlInfo.Token.remoteTtl,
                    CacheTtlInfo.Token.localTtl,
                ),
                this.setProxyCache(
                    'proxyPair',
                    'wrappedLpTokenID',
                    wrappedLpTokenID,
                    CacheTtlInfo.Token.remoteTtl,
                    CacheTtlInfo.Token.localTtl,
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
                    CacheTtlInfo.Token.remoteTtl,
                    CacheTtlInfo.Token.localTtl,
                ),
                this.setProxyCache(
                    'proxyFarm',
                    'intermediatedFarms',
                    intermediatedFarms,
                    oneHour(),
                ),
                this.tokenSetter.setTokenMetadata(assetTokenID, assetToken),
                this.tokenSetter.setNftCollectionMetadata(
                    lockedAssetTokenID,
                    lockedAssetToken,
                ),
                this.tokenSetter.setNftCollectionMetadata(
                    wrappedLpTokenID,
                    wrappedLpToken,
                ),
                this.tokenSetter.setNftCollectionMetadata(
                    wrappedFarmTokenID,
                    wrappedFarmToken,
                ),
            ]);
            await this.deleteCacheKeys();
        }
    }

    private async setProxyCache(
        proxy: string,
        key: string,
        value: any,
        remoteTtl: number = cacheConfig.default,
        localTtl?: number,
    ) {
        const cacheKey = generateCacheKeyFromParams(proxy, key);
        await this.cachingService.setCache(
            cacheKey,
            value,
            remoteTtl,
            localTtl,
        );
        this.invalidatedKeys.push(cacheKey);
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
