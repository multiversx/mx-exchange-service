import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { EnergyModel } from '../../../modules/energy/models/energy.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';

@ObjectType()
export class GlobalInfoByWeekModel {
    @Field()
    scAddress: string;

    @Field()
    week: number;

    @Field()
    apr: string;

    @Field(() => [EsdtTokenPayment])
    totalRewardsForWeek: [EsdtTokenPayment];

    @Field()
    totalEnergyForWeek: string;

    @Field()
    totalLockedTokensForWeek: string;

    constructor(init?: Partial<GlobalInfoByWeekModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserInfoByWeekModel {
    @Field()
    scAddress: string;

    @Field()
    userAddress: string;

    @Field()
    week: number;

    @Field()
    apr: string;

    @Field(() => EnergyModel)
    energyForWeek: EnergyModel;

    @Field(() => [EsdtTokenPayment])
    rewardsForWeek: [EsdtTokenPayment];

    constructor(init?: Partial<UserInfoByWeekModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class ClaimProgress {
    @Field(() => EnergyModel)
    energy: EnergyModel;

    @Field( () => Int)
    week: number;

    constructor(init?: Partial<ClaimProgress>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class GlobalInfoByWeekSubModel {
    @Field()
    lastGlobalUpdateWeek: number;

    constructor(init?: Partial<GlobalInfoByWeekSubModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserInfoByWeekSubModel {
    @Field(() => ClaimProgress)
    claimProgress: ClaimProgress;

    @Field()
    lastActiveWeekForUser: number;

    constructor(init?: Partial<UserInfoByWeekSubModel>) {
        Object.assign(this, init);
    }
}

@InputType()
export class WeekFilterPeriodModel {
    @Field({ nullable: true })
    start: number;

    @Field({ nullable: true })
    end: number;

    constructor(init?: Partial<WeekFilterPeriodModel>) {
        Object.assign(this, init);
    }
}
