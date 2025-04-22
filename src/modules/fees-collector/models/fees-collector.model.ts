import { Field, Int, ObjectType } from '@nestjs/graphql';
import { WeekTimekeepingModel } from '../../../submodules/week-timekeeping/models/week-timekeeping.model';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { TransactionModel } from '../../../models/transaction.model';

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
    lastGlobalUpdateWeek: number;

    @Field(() => [GlobalInfoByWeekModel])
    undistributedRewards: [GlobalInfoByWeekModel];

    @Field(() => [String])
    allTokens: string[];

    @Field(() => [String])
    knownContracts: string[];

    @Field(() => [EsdtTokenPayment])
    accumulatedFees: [EsdtTokenPayment];

    @Field()
    lockedTokenId: string;

    @Field()
    lockedTokensPerBlock: string;

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

    @Field(() => [EsdtTokenPayment])
    accumulatedRewards: [EsdtTokenPayment];

    @Field(() => ClaimProgress)
    claimProgress: ClaimProgress;

    @Field()
    lastActiveWeekForUser: number;

    @Field()
    lastWeekRewardsUSD: string;

    constructor(init?: Partial<UserEntryFeesCollectorModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FeesCollectorTransactionModel {
    @Field(() => TransactionModel, { nullable: true })
    transaction: TransactionModel;
    @Field(() => Int)
    count: number;

    constructor(init?: Partial<FeesCollectorTransactionModel>) {
        Object.assign(this, init);
    }
}
