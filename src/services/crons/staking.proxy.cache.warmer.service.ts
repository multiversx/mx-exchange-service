import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { SCAddressType } from 'src/modules/remote-config/models/sc-address.model';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { RemoteConfigSetterService } from 'src/modules/remote-config/remote-config.setter.service';
import { AbiStakingProxyService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { StakingProxySetterService } from 'src/modules/staking-proxy/services/staking.proxy.setter.service';
import { ContextSetterService } from '../context/context.setter.service';
import { SCAddressRepositoryService } from '../database/repositories/scAddress.repository';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class StakingProxyCacheWarmerService {
    constructor(
        private readonly abiService: AbiStakingProxyService,
        private readonly stakingProxySetter: StakingProxySetterService,
        private readonly apiService: ElrondApiService,
        private readonly contextSetter: ContextSetterService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly remoteConfigSetter: RemoteConfigSetterService,
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
                this.apiService.getToken(stakingTokenID),
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
                this.contextSetter.setTokenMetadata(
                    stakingTokenID,
                    stakingToken,
                ),
                this.contextSetter.setNftCollectionMetadata(
                    farmTokenID,
                    farmToken,
                ),
                this.contextSetter.setNftCollectionMetadata(
                    dualYieldTokenID,
                    dualYieldToken,
                ),
                this.contextSetter.setNftCollectionMetadata(
                    lpFarmTokenID,
                    lpFarmToken,
                ),
            ]);

            await this.deleteCacheKeys(cacheKeys);
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheFarmsStakingAddresses(): Promise<void> {
        await this.remoteConfigSetter.setSCAddressesFromDB(
            SCAddressType.STAKING_PROXY,
        );
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
