import { Field, ObjectType } from "@nestjs/graphql";
import { ClaimProgress } from "../services/progress/progress.compute.service";
import { EnergyModel } from "../../../modules/simple-lock/models/simple.lock.model";

@ObjectType()
export class WeeklyRewardsSplittingModel {
    @Field()
    scAddress: string;

    @Field()
    type: string;

    @Field()
    week: number;

    @Field()
    token: string;

    @Field()
    totalRewardsForWeek: number;

    @Field()
    totalEnergyForWeek: number;

    @Field()
    totalLockedTokensForWeek: number;

    @Field()
    lastGlobalUpdateWeek: number;

    constructor(init?: Partial<WeeklyRewardsSplittingModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserWeeklyRewardsSplittingModel {
    @Field()
    scAddress: string;

    @Field()
    type: string;

    @Field()
    week: number;

    @Field(() => ClaimProgress)
    claimProgress: ClaimProgress;

    @Field(() => EnergyModel)
    energyForWeek: EnergyModel;

    @Field()
    lastActiveWeekForUser: number;

    constructor(init?: Partial<UserWeeklyRewardsSplittingModel>) {
        Object.assign(this, init);
    }
}
