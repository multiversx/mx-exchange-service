import {
    BaseFarmEvent,
    BaseRewardsEvent,
    ClaimRewardsEventV2,
    EnterFarmEventV1_2,
    EnterFarmEventV1_3,
    EnterFarmEventV2,
    ExitFarmEventV1_2,
    ExitFarmEventV1_3,
    ExitFarmEventV2,
    FARM_EVENTS,
    RawEventType,
    RewardsEventV1_2,
    RewardsEventV1_3,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { farmVersion } from 'src/utils/farm.utils';
import { Logger } from 'winston';
import { FarmVersion } from '../farm/models/farm.model';
import { FarmSetterFactory } from '../farm/farm.setter.factory';
import { FarmAbiFactory } from '../farm/farm.abi.factory';

@Injectable()
export class RabbitMQFarmHandlerService {
    constructor(
        private readonly farmAbiFactory: FarmAbiFactory,
        private readonly farmSetterFactory: FarmSetterFactory,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleEnterFarmEvent(rawEvent: RawEventType): Promise<void> {
        const version = farmVersion(rawEvent.address);
        let event: BaseFarmEvent;
        switch (version) {
            case FarmVersion.V1_2:
                event = new EnterFarmEventV1_2(rawEvent);
                break;
            case FarmVersion.V1_3:
                event = new EnterFarmEventV1_3(rawEvent);
                break;
        }

        const cacheKey = await this.farmSetterFactory
            .useSetter(event.getAddress())
            .setFarmTokenSupply(event.getAddress(), event.farmSupply.toFixed());
        await this.deleteCacheKeys([cacheKey]);
        await this.pubSub.publish(FARM_EVENTS.ENTER_FARM, {
            enterFarmEvent: event,
        });
    }

    async handleExitFarmEvent(rawEvent: RawEventType): Promise<void> {
        const version = farmVersion(rawEvent.address);
        let event: BaseFarmEvent;
        switch (version) {
            case FarmVersion.V1_2:
                event = new ExitFarmEventV1_2(rawEvent);
                break;
            case FarmVersion.V1_3:
                event = new ExitFarmEventV1_3(rawEvent);
                break;
        }
        const cacheKey = await this.farmSetterFactory
            .useSetter(event.address)
            .setFarmTokenSupply(event.address, event.farmSupply.toFixed());
        await this.deleteCacheKeys([cacheKey]);
        await this.pubSub.publish(FARM_EVENTS.EXIT_FARM, {
            exitFarmEvent: event,
        });
    }

    async handleRewardsEvent(rawEvent: RawEventType): Promise<void> {
        const version = farmVersion(rawEvent.address);
        let event: BaseRewardsEvent;
        switch (version) {
            case FarmVersion.V1_2:
                event = new RewardsEventV1_2(rawEvent);
                break;
            case FarmVersion.V1_3:
                event = new RewardsEventV1_3(rawEvent);
                break;
        }

        const rewardPerShare = await this.farmAbiFactory
            .useAbi(event.address)
            .rewardPerShare(event.address);
        const cacheKey = await this.farmSetterFactory
            .useSetter(event.address)
            .setRewardPerShare(event.getAddress(), rewardPerShare);
        await this.deleteCacheKeys([cacheKey]);

        await this.pubSub.publish(FARM_EVENTS.CLAIM_REWARDS, {
            rewardsEvent: event,
        });
    }

    async handleEnterFarmEventV2(rawEvent: RawEventType): Promise<void> {
        const event = new EnterFarmEventV2(rawEvent);

        const cacheKeys = await Promise.all([
            this.farmSetterFactory
                .useSetter(event.address)
                .setFarmTokenSupply(event.address, event.farmSupply.toFixed()),
        ]);

        await this.deleteCacheKeys(cacheKeys);
    }

    async handleExitFarmEventV2(rawEvent: RawEventType): Promise<void> {
        const event = new ExitFarmEventV2(rawEvent);

        const cacheKeys = await Promise.all([
            this.farmSetterFactory
                .useSetter(event.address)
                .setFarmTokenSupply(event.address, event.farmSupply.toFixed()),
        ]);

        await this.deleteCacheKeys(cacheKeys);
    }

    async handleClaimRewardsEventV2(rawEvent: RawEventType): Promise<void> {
        const event = new ClaimRewardsEventV2(rawEvent);

        const cacheKeys = await Promise.all([
            this.farmSetterFactory
                .useSetter(event.address)
                .setFarmTokenSupply(event.address, event.farmSupply.toFixed()),
        ]);

        await this.deleteCacheKeys(cacheKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
