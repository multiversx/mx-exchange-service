import { Field, ObjectType } from "@nestjs/graphql";
import { ClaimProgress } from "../services/progress/progress.compute.service";
import { EnergyType } from "@elrondnetwork/erdjs-dex";

@ObjectType()
export class WeeklyRewardsSplittingModel {
    @Field()
    scAddress: string;

    @Field()
    week: number;

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
    week: number;

    @Field()
    claimProgress: ClaimProgress;

    @Field()
    energyFrorWeek: EnergyType;

    @Field()
    lastActiveWeekForUser: number;

    constructor(init?: Partial<UserWeeklyRewardsSplittingModel>) {
        Object.assign(this, init);
    }
}
