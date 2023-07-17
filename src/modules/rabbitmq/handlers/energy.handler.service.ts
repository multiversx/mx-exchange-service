import {
    EnergyEvent,
    SIMPLE_LOCK_ENERGY_EVENTS,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { EnergySetterService } from 'src/modules/energy/services/energy.setter.service';
import { UserEnergyComputeService } from 'src/modules/user/services/userEnergy/user.energy.compute.service';
import { UserEnergySetterService } from 'src/modules/user/services/userEnergy/user.energy.setter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';

@Injectable()
export class EnergyHandler {
    constructor(
        private readonly energySetter: EnergySetterService,
        private readonly userEnergySetter: UserEnergySetterService,
        private readonly userEnergyCompute: UserEnergyComputeService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleUpdateEnergy(event: EnergyEvent): Promise<void> {
        const caller = event.decodedTopics.caller;
        const cachedKeys = [];
        cachedKeys.push(
            await this.energySetter.setEnergyEntryForUser(
                caller.bech32(),
                event.newEnergyEntry.toJSON(),
            ),
        );

        const activeFarms = await this.userEnergyCompute.userActiveFarmsV2(
            caller.bech32(),
        );
        const promises = activeFarms.map((farm) =>
            this.userEnergyCompute.computeUserOutdatedContract(
                caller.bech32(),
                farm,
            ),
        );
        promises.push(
            this.userEnergyCompute.computeUserOutdatedContract(
                caller.bech32(),
                scAddress.feesCollector,
            ),
        );

        const outdatedContracts = await Promise.all(promises);
        for (const contract of outdatedContracts) {
            if (contract.address) {
                cachedKeys.push(
                    await this.userEnergySetter.setUserOutdatedContract(
                        caller.bech32(),
                        contract.address,
                        contract,
                    ),
                );
            }
        }

        await this.deleteCacheKeys(cachedKeys);
        await this.pubSub.publish(SIMPLE_LOCK_ENERGY_EVENTS.ENERGY_UPDATED, {
            updatedEnergy: event,
        });
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
