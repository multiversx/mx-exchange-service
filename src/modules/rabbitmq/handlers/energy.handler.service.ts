import {
    EnergyEvent,
    SIMPLE_LOCK_ENERGY_EVENTS,
} from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { EnergySetterService } from 'src/modules/simple-lock/services/energy/energy.setter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';

@Injectable()
export class EnergyHandler {
    constructor(
        private readonly energySetter: EnergySetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async handleUpdateEnergy(event: EnergyEvent): Promise<void> {
        const caller = event.decodedTopics.caller;
        const cachedKey = await this.energySetter.setEnergyEntryForUser(
            caller.bech32(),
            event.newEnergyEntry.toJSON(),
        );
        await this.deleteCacheKeys([cachedKey]);

        await this.pubSub.publish(SIMPLE_LOCK_ENERGY_EVENTS.ENERGY_UPDATED, {
            updatedEnergy: event,
        });
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
