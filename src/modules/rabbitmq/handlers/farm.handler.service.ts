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
import { FarmVersion } from '../../farm/models/farm.model';
import { FarmSetterFactory } from '../../farm/farm.setter.factory';
import { FarmAbiFactory } from '../../farm/farm.abi.factory';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { FarmSetterServiceV2 } from 'src/modules/farm/v2/services/farm.v2.setter.service';

@Injectable()
export class FarmHandlerService {
    constructor(
        private readonly farmAbiFactory: FarmAbiFactory,
        private readonly farmAbiV2: FarmAbiServiceV2,
        private readonly farmSetterFactory: FarmSetterFactory,
        private readonly farmSetterV2: FarmSetterServiceV2,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleEnterFarmEvent(rawEvent: RawEventType): Promise<void> {
        const version = farmVersion(rawEvent.address);
        switch (version) {
            case FarmVersion.V1_2:
                await this.handleEnterFarmEventV1_3(
                    new EnterFarmEventV1_2(rawEvent),
                );
                return;
            case FarmVersion.V1_3:
                await this.handleEnterFarmEventV1_3(
                    new EnterFarmEventV1_3(rawEvent),
                );
                return;
            case FarmVersion.V2:
                await this.handleEnterFarmEventV2(
                    new EnterFarmEventV2(rawEvent),
                );
                return;
        }
    }

    async handleExitFarmEvent(rawEvent: RawEventType): Promise<void> {
        const version = farmVersion(rawEvent.address);
        switch (version) {
            case FarmVersion.V1_2:
                await this.handleExitFarmEventV1_3(
                    new ExitFarmEventV1_2(rawEvent),
                );
                return;
            case FarmVersion.V1_3:
                await this.handleExitFarmEventV1_3(
                    new ExitFarmEventV1_3(rawEvent),
                );
                return;
            case FarmVersion.V2:
                await this.handleExitFarmEventV2(new ExitFarmEventV2(rawEvent));
                return;
        }
    }

    async handleRewardsEvent(rawEvent: RawEventType): Promise<void> {
        const version = farmVersion(rawEvent.address);
        switch (version) {
            case FarmVersion.V1_2:
                await this.handleClaimRewardsEventV1_3(
                    new RewardsEventV1_2(rawEvent),
                );
                return;
            case FarmVersion.V1_3:
                await this.handleClaimRewardsEventV1_3(
                    new RewardsEventV1_3(rawEvent),
                );
                return;
            case FarmVersion.V2:
                await this.handleClaimRewardsEventV2(
                    new ClaimRewardsEventV2(rawEvent),
                );
                return;
        }
    }

    private async handleEnterFarmEventV1_3(
        event: BaseFarmEvent,
    ): Promise<void> {
        const cacheKey = await this.farmSetterFactory
            .useSetter(event.getAddress())
            .setFarmTokenSupply(event.getAddress(), event.farmSupply.toFixed());
        await this.deleteCacheKeys([cacheKey]);
        await this.pubSub.publish(FARM_EVENTS.ENTER_FARM, {
            enterFarmEvent: event,
        });
    }

    private async handleExitFarmEventV1_3(event: BaseFarmEvent): Promise<void> {
        const cacheKey = await this.farmSetterFactory
            .useSetter(event.address)
            .setFarmTokenSupply(event.address, event.farmSupply.toFixed());
        await this.deleteCacheKeys([cacheKey]);
        await this.pubSub.publish(FARM_EVENTS.EXIT_FARM, {
            exitFarmEvent: event,
        });
    }

    private async handleClaimRewardsEventV1_3(
        event: BaseRewardsEvent,
    ): Promise<void> {
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

    private async handleEnterFarmEventV2(
        event: EnterFarmEventV2,
    ): Promise<void> {
        const userTotalFarmPosition =
            await this.farmAbiV2.getUserTotalFarmPositionRaw(
                event.address,
                event.decodedTopics.caller.bech32(),
            );
        const cacheKeys = await Promise.all([
            this.farmSetterFactory
                .useSetter(event.address)
                .setFarmTokenSupply(event.address, event.farmSupply.toFixed()),
            this.farmSetterV2.setUserTotalFarmPosition(
                event.address,
                event.decodedTopics.caller.bech32(),
                userTotalFarmPosition,
            ),
        ]);
        await this.deleteCacheKeys(cacheKeys);
    }

    private async handleExitFarmEventV2(event: ExitFarmEventV2): Promise<void> {
        const userTotalFarmPosition =
            await this.farmAbiV2.getUserTotalFarmPositionRaw(
                event.address,
                event.decodedTopics.caller.bech32(),
            );
        const cacheKeys = await Promise.all([
            this.farmSetterFactory
                .useSetter(event.address)
                .setFarmTokenSupply(event.address, event.farmSupply.toFixed()),
            this.farmSetterV2.setUserTotalFarmPosition(
                event.address,
                event.decodedTopics.caller.bech32(),
                userTotalFarmPosition,
            ),
        ]);
        await this.deleteCacheKeys(cacheKeys);
    }

    private async handleClaimRewardsEventV2(
        event: ClaimRewardsEventV2,
    ): Promise<void> {
        const userTotalFarmPosition =
            await this.farmAbiV2.getUserTotalFarmPositionRaw(
                event.address,
                event.decodedTopics.caller.bech32(),
            );
        const cacheKeys = await Promise.all([
            this.farmSetterFactory
                .useSetter(event.address)
                .setFarmTokenSupply(event.address, event.farmSupply.toFixed()),
            this.farmSetterV2.setUserTotalFarmPosition(
                event.address,
                event.decodedTopics.caller.bech32(),
                userTotalFarmPosition,
            ),
        ]);
        await this.deleteCacheKeys(cacheKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
