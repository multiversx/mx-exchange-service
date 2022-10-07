import { Field, ObjectType } from '@nestjs/graphql';
import { WeeklyTimekeepingModel } from "../../../submodules/week-timekeeping/models/weekly-timekeeping.model";
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
    time: WeeklyTimekeepingModel;

    @Field()
    splitRewards: WeeklyRewardsSplittingModel;

    constructor(init?: Partial<FeesCollectorModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserEntryFeesCollectorModel {
    @Field()
    address: string;

    @Field()
    week: number;

    @Field()
    time: WeeklyTimekeepingModel;

    @Field()
    userSplitRewards: UserWeeklyRewardsSplittingModel;

    constructor(init?: Partial<FeesCollectorModel>) {
        Object.assign(this, init);
    }
}
