import { Field, Int, ObjectType } from '@nestjs/graphql';
import { WeekTimekeepingModel } from '../../../submodules/week-timekeeping/models/week-timekeeping.model';
import {
    GlobalInfoByWeekModel, GlobalInfoByWeekSubModel, UserInfoByWeekModel, UserInfoByWeekSubModel,
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { TransactionModel } from "../../../models/transaction.model";

@ObjectType()
export class FeesCollectorModel extends GlobalInfoByWeekSubModel {
    @Field()
    address: string;

    @Field()
    time: WeekTimekeepingModel;

    @Field()
    startWeek: number;

    @Field()
    endWeek: number;

    @Field(() => [GlobalInfoByWeekModel])
    undistributedRewards: [GlobalInfoByWeekModel];

    @Field(() => [String])
    allTokens: string[]

    @Field(() => [EsdtTokenPayment])
    accumulatedFees: [EsdtTokenPayment]

    @Field(() => [EsdtTokenPayment])
    accumulatedLockedFees: [EsdtTokenPayment]

    constructor(init?: Partial<FeesCollectorModel>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserEntryFeesCollectorModel extends UserInfoByWeekSubModel {
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

    constructor(init?: Partial<UserEntryFeesCollectorModel>) {
        super(init);
        Object.assign(this, init);
    }
}


@ObjectType()
export class FeesCollectorTransactionModel {
    @Field(() => TransactionModel, { nullable: true })
    transaction: TransactionModel
    @Field(() => Int)
    count: number;

    constructor(init?: Partial<FeesCollectorTransactionModel>) {
        Object.assign(this, init);
    }
}
