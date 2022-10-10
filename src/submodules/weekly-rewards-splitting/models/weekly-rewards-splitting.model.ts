import { Field, ObjectType } from "@nestjs/graphql";
import { ClaimProgress } from "../services/progress/progress.compute.service";
import { EnergyModel } from "../../../modules/simple-lock/models/simple.lock.model";
import { EsdtTokenPayment } from "../../../models/esdtTokenPayment.model";

@ObjectType()
export class WeeklyRewardsSplittingModel {
    @Field()
    scAddress: string;

    @Field()
    week: number;

    @Field(() => [EsdtTokenPayment])
    totalRewardsForWeek: [EsdtTokenPayment];

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
    week: number;

    @Field()
    claimProgress: ClaimProgress;

    @Field()
    energyForWeek: EnergyModel;

    @Field()
    lastActiveWeekForUser: number;

    constructor(init?: Partial<UserWeeklyRewardsSplittingModel>) {
        Object.assign(this, init);
    }
}
