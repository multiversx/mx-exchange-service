import {
    RawEvent,
    StakeClaimRewardsEvent,
    StakeEvent,
    UnstakeEvent,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { StakingSetterService } from 'src/modules/staking/services/staking.setter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';

@Injectable()
export class StakingHandlerService {
    constructor(
        private readonly stakingAbi: StakingAbiService,
        private readonly stakingSetter: StakingSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleStakeEvent(rawEvent: RawEvent): Promise<void> {
        const event = new StakeEvent(rawEvent);
        const userTotalFarmPosition =
            await this.stakingAbi.getUserTotalStakePositionRaw(
                event.address,
                event.decodedTopics.caller.bech32(),
            );
        const cacheKeys = await Promise.all([
            this.stakingSetter.setFarmTokenSupply(
                event.address,
                event.farmSupply.toFixed(),
            ),
            this.stakingSetter.setUserTotalStakePosition(
                event.address,
                event.decodedTopics.caller.bech32(),
                userTotalFarmPosition,
            ),
        ]);
        await this.deleteCacheKeys(cacheKeys);
    }

    async handleUnstakeEvent(rawEvent: RawEvent): Promise<void> {
        const event = new UnstakeEvent(rawEvent);
        const userTotalFarmPosition =
            await this.stakingAbi.getUserTotalStakePositionRaw(
                event.address,
                event.decodedTopics.caller.bech32(),
            );
        const cacheKeys = await Promise.all([
            this.stakingSetter.setFarmTokenSupply(
                event.address,
                event.farmSupply.toFixed(),
            ),
            this.stakingSetter.setUserTotalStakePosition(
                event.address,
                event.decodedTopics.caller.bech32(),
                userTotalFarmPosition,
            ),
        ]);
        await this.deleteCacheKeys(cacheKeys);
    }

    async handleClaimRewardsEvent(rawEvent: RawEvent): Promise<void> {
        const event = new StakeClaimRewardsEvent(rawEvent);
        const userTotalFarmPosition =
            await this.stakingAbi.getUserTotalStakePositionRaw(
                event.address,
                event.decodedTopics.caller.bech32(),
            );
        const cacheKeys = await Promise.all([
            this.stakingSetter.setFarmTokenSupply(
                event.address,
                event.farmSupply.toFixed(),
            ),
            this.stakingSetter.setUserTotalStakePosition(
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
