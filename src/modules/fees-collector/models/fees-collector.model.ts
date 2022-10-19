import { Field, ObjectType } from '@nestjs/graphql';
import { WeekTimekeepingModel } from '../../../submodules/week-timekeeping/models/week-timekeeping.model';
import {
    ClaimProgress,
    GlobalInfoByWeekModel, UserInfoByWeekModel,
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';

@ObjectType()
export class FeesCollectorModel {
    @Field()
    address: string;

    @Field()
    time: WeekTimekeepingModel;

    @Field()
    startWeek: number;

    @Field()
    endWeek: number;

    @Field()
    apr: string;

    @Field(() => [GlobalInfoByWeekModel])
    undistributedRewards: [GlobalInfoByWeekModel];

    @Field(() => [String])
    allTokens: string[]

    @Field(() => [EsdtTokenPayment])
    accumulatedFees: [EsdtTokenPayment]

    @Field()
    lastGlobalUpdateWeek: number;

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
    time: WeekTimekeepingModel;

    @Field()
    startWeek: number;

    @Field()
    endWeek: number;

    @Field(() => [UserInfoByWeekModel])
    undistributedRewards: [UserInfoByWeekModel];

    @Field(() => ClaimProgress)
    claimProgress: ClaimProgress;

    @Field()
    lastActiveWeekForUser: number;

    constructor(init?: Partial<UserEntryFeesCollectorModel>) {
        Object.assign(this, init);
    }
}
