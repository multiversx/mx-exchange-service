import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { AbiFarmService } from '../farm/services/abi-farm.service';
import { FarmComputeService } from '../farm/services/farm.compute.service';
import { FarmSetterService } from '../farm/services/farm.setter.service';
import { EnterFarmEvent } from './entities/farm/enterFarm.event';
import { ExitFarmEvent } from './entities/farm/exitFarm.event';
import { RewardsEvent } from './entities/farm/rewards.event';
import { FARM_EVENTS } from './entities/generic.types';

@Injectable()
export class WebSocketFarmHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abiFarmService: AbiFarmService,
        private readonly farmSetterService: FarmSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleFarmEvent(
        event: EnterFarmEvent | ExitFarmEvent,
    ): Promise<void> {
        const [
            lastRewardBlockNonce,
            undistributedFees,
            currentBlockFee,
            farmRewardPerShare,
        ] = await Promise.all([
            this.abiFarmService.getLastRewardBlockNonce(event.getAddress()),
            this.abiFarmService.getUndistributedFees(event.getAddress()),
            this.abiFarmService.getCurrentBlockFee(event.getAddress()),
            this.abiFarmService.getRewardPerShare(event.getAddress()),
        ]);

        const cacheKeys = await Promise.all([
            this.farmSetterService.setFarmTokenSupply(
                event.getAddress(),
                event.getFarmSupply().toFixed(),
            ),
            this.farmSetterService.setFarmingTokenReserve(
                event.getAddress(),
                event.getFarmingReserve().toFixed(),
            ),
            this.farmSetterService.setLastRewardBlockNonce(
                event.getAddress(),
                lastRewardBlockNonce,
            ),
            this.farmSetterService.setUndistributedFees(
                event.getAddress(),
                undistributedFees,
            ),
            this.farmSetterService.setCurrentBlockFee(
                event.getAddress(),
                currentBlockFee,
            ),
            this.farmSetterService.setRewardPerShare(
                event.getAddress(),
                farmRewardPerShare,
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();
        event instanceof EnterFarmEvent
            ? this.pubSub.publish(FARM_EVENTS.ENTER_FARM, {
                  enterFarmEvent: event,
              })
            : this.pubSub.publish(FARM_EVENTS.EXIT_FARM, {
                  exitFarmEvent: event,
              });
    }

    async handleRewardsEvent(event: RewardsEvent): Promise<void> {
        const [
            lastRewardBlockNonce,
            undistributedFees,
            currentBlockFee,
            farmRewardPerShare,
        ] = await Promise.all([
            this.abiFarmService.getLastRewardBlockNonce(event.getAddress()),
            this.abiFarmService.getUndistributedFees(event.getAddress()),
            this.abiFarmService.getCurrentBlockFee(event.getAddress()),
            this.abiFarmService.getRewardPerShare(event.getAddress()),
        ]);

        const cacheKeys = await Promise.all([
            this.farmSetterService.setLastRewardBlockNonce(
                event.getAddress(),
                lastRewardBlockNonce,
            ),
            this.farmSetterService.setUndistributedFees(
                event.getAddress(),
                undistributedFees,
            ),
            this.farmSetterService.setCurrentBlockFee(
                event.getAddress(),
                currentBlockFee,
            ),
            this.farmSetterService.setRewardPerShare(
                event.getAddress(),
                farmRewardPerShare,
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();

        this.pubSub.publish(FARM_EVENTS.CLAIM_REWARDS, {
            rewardsEvent: event,
        });
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
