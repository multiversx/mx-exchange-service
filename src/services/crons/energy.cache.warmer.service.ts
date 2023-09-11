import { Inject, Injectable } from '@nestjs/common';
import { PUB_SUB } from '../redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { EnergySetterService } from 'src/modules/energy/services/energy.setter.service';
import { Lock } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class EnergyCacheWarmerService {
    constructor(
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        private readonly energyAbi: EnergyAbiService,
        private readonly energySetter: EnergySetterService,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    @Lock({ name: 'cacheEnergyContract', verbose: true })
    async cacheEnergyContract(): Promise<void> {
        const pauseState = await this.energyAbi.isPausedRaw();
        const cacheKey = await this.energySetter.setPauseState(pauseState);
        await this.deleteCacheKeys([cacheKey]);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
