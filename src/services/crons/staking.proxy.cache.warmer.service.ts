import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { StakingProxySetterService } from 'src/modules/staking-proxy/services/staking.proxy.setter.service';
import { PUB_SUB } from '../redis.pubSub.module';
import { StakingProxyService } from 'src/modules/staking-proxy/services/staking.proxy.service';

@Injectable()
export class StakingProxyCacheWarmerService {
    constructor(
        private readonly abiService: StakingProxyAbiService,
        private readonly stakingProxySetter: StakingProxySetterService,
        private readonly stakingProxyService: StakingProxyService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async cacheFarmsStaking(): Promise<void> {
        const stakingProxiesAddress: string[] =
            await this.stakingProxyService.getStakingProxyAddresses();
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
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
