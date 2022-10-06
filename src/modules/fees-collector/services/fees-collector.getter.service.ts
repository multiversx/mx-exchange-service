import { Inject, Injectable } from "@nestjs/common";
import { GenericGetterService } from "../../../services/generics/generic.getter.service";
import { CachingService } from "../../../services/caching/cache.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { FeesCollectorAbiService } from "./fees-collector.abi.service";
import { generateCacheKeyFromParams } from "../../../utils/generate-cache-key";
import {
    WeeklyRewardsSplittingGetterService
} from "../../../submodules/weekly-rewards-splitting/services/weekly-rewards.splitting.getter.service";
import { Mixin } from "ts-mixer";
import {
    WeeklyRewardsSplittingAbiService
} from "../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service";
import { ClaimProgress } from "../../../submodules/weekly-rewards-splitting/services/progress/progress.compute.service";
import { oneMinute } from "../../../helpers/helpers";

@Injectable()
export class FeesCollectorGetterService extends Mixin(GenericGetterService, WeeklyRewardsSplittingGetterService) {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly weeklyRewardsAbiService: WeeklyRewardsSplittingAbiService,
        private readonly abiService: FeesCollectorAbiService,
    ) {
        super(cachingService, logger);
        super(cachingService, logger, this.weeklyRewardsAbiService);
    }

    async getAccumulatedFees(scAddress: string, week: number, token: string): Promise<ClaimProgress> {
        return this.getData(
            this.getFeesCollectorCacheKey(scAddress,'accumulatedFees', week, token),
            () => this.abiService.accumulatedFees(scAddress, week, token),
            oneMinute(),
        )
    }

    private getFeesCollectorCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams(address, ...args);
    }


}
