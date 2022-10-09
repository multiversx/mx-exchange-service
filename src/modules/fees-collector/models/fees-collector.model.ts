import { Field, ObjectType } from '@nestjs/graphql';
import { WeekTimekeepingModel } from "../../../submodules/week-timekeeping/models/week-timekeeping.model";
import {
    UserWeeklyRewardsSplittingModel,
    WeeklyRewardsSplittingModel
} from "../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model";

@ObjectType()
export class FeesCollectorModel {
    @Field()
    address: string;

    @Field()
    week: number;

    @Field()
    token: string;

    @Field()
    time: WeekTimekeepingModel;

    @Field( () => WeeklyRewardsSplittingModel)
    splitRewards: WeeklyRewardsSplittingModel;

    @Field()
    accumulatedFees: number;

    constructor(init?: Partial<FeesCollectorModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserEntryFeesCollectorModel {
    @Field()
    address: string;

    @Field()
    userAddress: string;

    @Field()
    week: number;

    @Field( () => WeekTimekeepingModel)
    time: WeekTimekeepingModel;

    @Field(() => UserWeeklyRewardsSplittingModel)
    userSplitRewards: UserWeeklyRewardsSplittingModel;

    constructor(init?: Partial<UserEntryFeesCollectorModel>) {
        Object.assign(this, init);
    }
}
