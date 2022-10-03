import {
    EnterFarmEvent,
    ExitFarmEvent,
    FARM_EVENTS,
    RewardsEvent,
} from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { farmVersion } from 'src/utils/farm.utils';
import { Logger } from 'winston';
import { FarmVersion } from '../farm/models/farm.model';
import { AbiFarmService } from '../farm/services/farm.abi.service';
import { FarmSetterService } from '../farm/services/farm.setter.service';

@Injectable()
export class RabbitMQFarmHandlerService {
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
        const [lastRewardBlockNonce, undistributedFees] = await Promise.all([
            this.abiFarmService.getLastRewardBlockNonce(event.getAddress()),
            this.abiFarmService.getRewardPerShare(event.getAddress()),
        ]);
        const version = farmVersion(event.getAddress());
        const cacheKeys = await Promise.all([
            this.farmSetterService.setFarmTokenSupply(
                event.getAddress(),
                event.getFarmSupply().toFixed(),
            ),
            this.farmSetterService.setLastRewardBlockNonce(
                event.getAddress(),
                lastRewardBlockNonce,
            ),
            this.farmSetterService.setUndistributedFees(
                event.getAddress(),
                undistributedFees,
            ),
        ]);
        if (version === FarmVersion.V1_2) {
            cacheKeys.push(
                await this.farmSetterService.setFarmingTokenReserve(
                    event.getAddress(),
                    event.getFarmingReserve().toFixed(),
                ),
            );
        }
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();
        event.getIdentifier() === FARM_EVENTS.ENTER_FARM
            ? await this.pubSub.publish(FARM_EVENTS.ENTER_FARM, {
                  enterFarmEvent: event,
              })
            : await this.pubSub.publish(FARM_EVENTS.EXIT_FARM, {
                  exitFarmEvent: event,
              });
    }

    async handleRewardsEvent(event: RewardsEvent): Promise<void> {
        const [lastRewardBlockNonce, farmRewardPerShare] = await Promise.all([
            this.abiFarmService.getLastRewardBlockNonce(event.getAddress()),
            this.abiFarmService.getRewardPerShare(event.getAddress()),
        ]);

        const cacheKeys = await Promise.all([
            this.farmSetterService.setLastRewardBlockNonce(
                event.getAddress(),
                lastRewardBlockNonce,
            ),
            this.farmSetterService.setRewardPerShare(
                event.getAddress(),
                farmRewardPerShare,
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
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
