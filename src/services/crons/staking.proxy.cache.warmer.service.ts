import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { StakingProxySetterService } from 'src/modules/staking-proxy/services/staking.proxy.setter.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class StakingProxyCacheWarmerService {
    constructor(
        private readonly abiService: StakingProxyAbiService,
        private readonly stakingProxySetter: StakingProxySetterService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async cacheFarmsStaking(): Promise<void> {
        const stakingProxiesAddress: string[] =
            await this.remoteConfigGetterService.getStakingProxyAddresses();
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
                this.abiService.getlpFarmAddressRaw(address),
                this.abiService.getStakingFarmAddressRaw(address),
                this.abiService.getPairAddressRaw(address),
                this.abiService.getStakingTokenIDRaw(address),
                this.abiService.getFarmTokenIDRaw(address),
                this.abiService.getDualYieldTokenIDRaw(address),
                this.abiService.getLpFarmTokenIDRaw(address),
            ]);

            const cacheKeys = await Promise.all([
                this.stakingProxySetter.setLpFarmAddress(
                    address,
                    lpFarmAddress,
                ),
                this.stakingProxySetter.setStakingFarmAddress(
                    address,
                    stakingFarmAddress,
                ),
                this.stakingProxySetter.setPairAddress(address, pairAddress),
                this.stakingProxySetter.setFarmTokenID(address, farmTokenID),
                this.stakingProxySetter.setDualYieldTokenID(
                    address,
                    dualYieldTokenID,
                ),
                this.stakingProxySetter.setLpFarmTokenID(
                    address,
                    lpFarmTokenID,
                ),
                this.stakingProxySetter.setStakingTokenID(
                    address,
                    stakingTokenID,
                ),
            ]);

            await this.deleteCacheKeys(cacheKeys);
        }
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        invalidatedKeys = invalidatedKeys.filter((key) => key !== undefined);

        if (invalidatedKeys.length === 0) {
            return;
        }

        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
