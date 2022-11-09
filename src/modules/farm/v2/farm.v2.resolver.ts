import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { BoostedYieldsFactors, FarmModelV2 } from '../models/farm.v2.model';
import { FarmGetterServiceV2 } from './services/farm.v2.getter.service';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmServiceV2 } from "./services/farm.v2.service";
import {
    GlobalInfoByWeekModel,
} from "../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model";
import { WeekTimekeepingModel } from "../../../submodules/week-timekeeping/models/week-timekeeping.model";
import { FarmComputeServiceV2 } from "./services/farm.v2.compute.service";

@Resolver(() => FarmModelV2)
export class FarmResolverV2 extends FarmResolver {
    constructor(
        protected readonly farmGetter: FarmGetterServiceV2,
        protected readonly farmService: FarmServiceV2,
        protected readonly farmCompute: FarmComputeServiceV2,
    ) {
        super(farmGetter);
    }

    @ResolveField()
    async baseApr(
        @Parent() parent: FarmModelV2,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmCompute.computeFarmBaseAPR(parent.address),
        );
    }

    @ResolveField()
    async boosterRewards(
        @Parent() parent: FarmModelV2,
    ): Promise<GlobalInfoByWeekModel[]> {
        const modelsList = []
        const currentWeek = await this.farmGetter.getCurrentWeek(parent.address)
        for (let week = 1; week <= currentWeek; week++) {
            modelsList.push(this.farmService.getGlobalInfoByWeek(parent.address, week))
        }
        return modelsList;
    }

    @ResolveField()
    async time(
        @Parent() parent: FarmModelV2,
    ): Promise<WeekTimekeepingModel> {
        return await this.genericFieldResolver(() =>
            this.farmService.getWeeklyTimekeeping(parent.address),
        );
    }

    @ResolveField()
    async boostedYieldsRewardsPercenatage(
        @Parent() parent: FarmModelV2,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getBoostedYieldsRewardsPercenatage(parent.address),
        );
    }

    @ResolveField()
    async boostedYieldsFactors(
        @Parent() parent: FarmModelV2,
    ): Promise<BoostedYieldsFactors> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getBoostedYieldsFactors(parent.address),
        );
    }

    @ResolveField()
    async lockingScAddress(@Parent() parent: FarmModelV2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getLockingScAddress(parent.address),
        );
    }

    @ResolveField()
    async lockEpochs(@Parent() parent: FarmModelV2): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getLockEpochs(parent.address),
        );
    }

    @ResolveField()
    async undistributedBoostedRewards(
        @Parent() parent: FarmModelV2,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getUndistributedBoostedRewards(parent.address),
        );
    }

    @ResolveField()
    async energyFactoryAddress(@Parent() parent: FarmModelV2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getEnergyFactoryAddress(parent.address),
        );
    }
}
