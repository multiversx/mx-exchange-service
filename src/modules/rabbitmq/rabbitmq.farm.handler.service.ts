import {
    BaseRewardsEvent,
    EnterFarmEventV1_2,
    EnterFarmEventV1_3,
    ExitFarmEventV1_2,
    ExitFarmEventV1_3,
    FARM_EVENTS,
    RawEventType,
    RewardsEventV1_2,
    RewardsEventV1_3,
} from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { farmVersion } from 'src/utils/farm.utils';
import { Logger } from 'winston';
import { FarmVersion } from '../farm/models/farm.model';
import { AbiFarmService } from '../farm/base-module/services/farm.abi.service';
import { BaseFarmEvent } from '@elrondnetwork/erdjs-dex/dist/event-decoder/farm/enter.farm.base.event';
import { FarmAbiServiceV1_2 } from '../farm/v1.2/services/farm.v1.2.abi.service';
import { FarmAbiServiceV1_3 } from '../farm/v1.3/services/farm.v1.3.abi.service';
import { FarmSetterFactory } from '../farm/farm.setter.factory';

@Injectable()
export class RabbitMQFarmHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abiFarmV1_2: FarmAbiServiceV1_2,
        private readonly abiFarmV1_3: FarmAbiServiceV1_3,
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
            case FarmVersion.V2:
                return;
        }
        const cacheKey = await this.farmSetterFactory
            .useSetter(event.getAddress())
            .setFarmTokenSupply(event.getAddress(), event.farmSupply.toFixed());
        this.invalidatedKeys.push(cacheKey);
        await this.deleteCacheKeys();
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
            case FarmVersion.V2:
                return;
        }
        const cacheKey = await this.farmSetterFactory
            .useSetter(event.getAddress())
            .setFarmTokenSupply(event.getAddress(), event.farmSupply.toFixed());
        this.invalidatedKeys.push(cacheKey);
        await this.deleteCacheKeys();
        await this.pubSub.publish(FARM_EVENTS.EXIT_FARM, {
            exitFarmEvent: event,
        });
    }

    async handleRewardsEvent(rawEvent: RawEventType): Promise<void> {
        const version = farmVersion(rawEvent.address);
        let event: BaseRewardsEvent;
        let abiService: AbiFarmService;
        switch (version) {
            case FarmVersion.V1_2:
                event = new RewardsEventV1_2(rawEvent);
                abiService = this.abiFarmV1_2;
                break;
            case FarmVersion.V1_3:
                event = new RewardsEventV1_3(rawEvent);
                abiService = this.abiFarmV1_3;
                break;
            case FarmVersion.V2:
                return;
        }

        const rewardPerShare = await abiService.getRewardPerShare(
            event.address,
        );
        const cacheKey = await this.farmSetterFactory
            .useSetter(event.address)
            .setRewardPerShare(event.getAddress(), rewardPerShare);
        this.invalidatedKeys.push(cacheKey);
        await this.deleteCacheKeys();

        await this.pubSub.publish(FARM_EVENTS.CLAIM_REWARDS, {
            rewardsEvent: event,
        });
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
