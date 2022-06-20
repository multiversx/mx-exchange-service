import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { cacheConfig, scAddress } from 'src/config';
import { oneHour } from 'src/helpers/helpers';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { AbiStakingProxyService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { StakingProxySetterService } from 'src/modules/staking-proxy/services/staking.proxy.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class StakingProxyCacheWarmerService {
    constructor(
        private readonly abiService: AbiStakingProxyService,
        private readonly stakingProxySetter: StakingProxySetterService,
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async cacheFarmsStaking(): Promise<void> {
        const stakingProxiesAddress: string[] = await this.remoteConfigGetterService.getStakingProxyAddresses();
        for (const address of stakingProxiesAddress) {
            const [
                lpFarmAddress,
                stakingFarmAddress,
                pairAddress,
                stakingTokenID,
                farmTokenID,
                dualYieldTokenID,
                lpFarmTokenID,
            ] = await Promise.all([
                this.abiService.getLpFarmAddress(address),
                this.abiService.getStakingFarmAddress(address),
                this.abiService.getPairAddress(address),
                this.abiService.getStakingTokenID(address),
                this.abiService.getFarmTokenID(address),
                this.abiService.getDualYieldTokenID(address),
                this.abiService.getLpFarmTokenID(address),
            ]);

            const [
                stakingToken,
                farmToken,
                dualYieldToken,
                lpFarmToken,
            ] = await Promise.all([
                this.apiService.getNftCollection(stakingTokenID),
                this.apiService.getNftCollection(farmTokenID),
                this.apiService.getNftCollection(dualYieldTokenID),
                this.apiService.getNftCollection(lpFarmTokenID),
            ]);

            const cacheKeys = await Promise.all([
                this.stakingProxySetter.setLpFarmAddress(lpFarmAddress),
                this.stakingProxySetter.setStakingFarmAddress(
                    stakingFarmAddress,
                ),
                this.stakingProxySetter.setPairAddress(pairAddress),
                this.stakingProxySetter.setFarmTokenID(farmTokenID),
                this.stakingProxySetter.setDualYieldTokenID(dualYieldTokenID),
                this.stakingProxySetter.setLpFarmTokenID(lpFarmTokenID),
                this.setContextCache(stakingTokenID, stakingToken, oneHour()),
                this.setContextCache(farmTokenID, farmToken, oneHour()),
                this.setContextCache(
                    dualYieldTokenID,
                    dualYieldToken,
                    oneHour(),
                ),
                this.setContextCache(lpFarmTokenID, lpFarmToken, oneHour()),
            ]);

            await this.deleteCacheKeys(cacheKeys);
        }
    }

    private async setContextCache(
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ): Promise<string> {
        const cacheKey = generateCacheKeyFromParams('context', key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        return cacheKey;
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
