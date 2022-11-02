import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { Logger } from 'winston';
import { FarmServiceBase } from '../../base-module/services/farm.base.service';
import { FarmAbiServiceV2 } from './farm.v2.abi.service';
import { FarmGetterServiceV2 } from './farm.v2.getter.service';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { RewardsModel } from '../../models/farm.model';
import { FarmTokenAttributesModelV1_3 } from '../../models/farmTokenAttributes.model';
import { FarmComputeServiceV2 } from './farm.v2.compute.service';
import {
    WeeklyRewardsSplittingService
} from "../../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.service";
import { WeekTimekeepingService } from "../../../../submodules/week-timekeeping/services/week-timekeeping.service";
import { Mixin } from "ts-mixer";
import { FarmTokenAttributesV1_3 } from "@elrondnetwork/erdjs-dex";
import BigNumber from "bignumber.js";
import {
    UserInfoByWeekModel
} from "../../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model";

@Injectable()
export class FarmServiceV2 extends Mixin(FarmServiceBase, WeekTimekeepingService, WeeklyRewardsSplittingService) {
    constructor(
        protected readonly abiService: FarmAbiServiceV2,
        @Inject(forwardRef(() => FarmGetterServiceV2))
        protected readonly farmGetter: FarmGetterServiceV2,
        protected readonly farmCompute: FarmComputeServiceV2,
        protected readonly contextGetter: ContextGetterService,
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(
            abiService,
            farmGetter,
            farmCompute,
            contextGetter,
            cachingService,
            logger,
        );
    }

    async getRewardsForPosition(
        positon: CalculateRewardsArgs,
    ): Promise<RewardsModel> {
        const farmTokenAttributes = FarmTokenAttributesV1_3.fromAttributes(
            positon.attributes,
        );
        let rewards: BigNumber;
        if (positon.vmQuery) {
            rewards = await this.abiService.calculateRewardsForGivenPosition(
                positon,
            );
        } else {
            rewards = await this.farmCompute.computeFarmRewardsForPosition(
                positon.farmAddress,
                positon.liquidity,
                farmTokenAttributes.rewardPerShare,
            );
        }
        const currentWeek = await this.farmGetter.getCurrentWeek(positon.farmAddress);
        const modelsList: UserInfoByWeekModel[] = []
        for (let week = 1; week <= currentWeek; week++) {
            modelsList.push(this.getUserInfoByWeek(positon.farmAddress, positon.user, week))
        }
        return new RewardsModel({
            identifier: positon.identifier,
            remainingFarmingEpochs: await this.getRemainingFarmingEpochs(
                positon.farmAddress,
                farmTokenAttributes.enteringEpoch,
            ),
            rewards: rewards.integerValue().toFixed(),
            boostedRewardsWeeklyInfo: modelsList,
        });
    }

    decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModelV1_3 {
        return new FarmTokenAttributesModelV1_3({
            ...FarmTokenAttributesV1_3.fromAttributes(attributes).toJSON(),
            attributes: attributes,
            identifier: identifier,
        });
    }
}
