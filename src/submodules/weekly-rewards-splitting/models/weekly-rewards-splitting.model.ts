import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { EnergyModel } from '../../../modules/simple-lock/models/simple.lock.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';

@ObjectType()
export class GlobalInfoByWeekModel {
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
    energyForWeek: EnergyModel;

    @Field( () => [EsdtTokenPayment])
    rewardsForWeek: [EsdtTokenPayment];

    constructor(init?: Partial<UserInfoByWeekModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class ClaimProgress {
    @Field()
    energy: EnergyModel;

    @Field()
    week: number

    constructor(init?: Partial<ClaimProgress>) {
        Object.assign(this, init);
    }
}

@InputType()
export class WeekFilterPeriodModel {
    @Field( {nullable: true})
    start: number

    @Field( {nullable: true})
    end: number

    constructor(init?: Partial<WeekFilterPeriodModel>) {
        Object.assign(this, init);
    }
}
