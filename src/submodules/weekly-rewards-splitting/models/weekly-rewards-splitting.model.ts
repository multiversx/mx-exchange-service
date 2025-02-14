import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EnergyModel } from '../../../modules/energy/models/energy.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';

@ObjectType()
export class TokenDistributionModel {
    @Field()
    tokenId: string;
    @Field()
    percentage: string;

    constructor(init?: Partial<TokenDistributionModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class GlobalInfoByWeekModel {
    @Field()
    scAddress: string;

    @Field()
    week: number;

    @Field()
    apr: string;

    @Field(() => [EsdtTokenPayment], { complexity: nestedFieldComplexity })
    totalRewardsForWeek: [EsdtTokenPayment];

    @Field(() => [
        TokenDistributionModel,
        { complexity: nestedFieldComplexity },
    ])
    rewardsDistributionForWeek: TokenDistributionModel[];

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

    @Field({ nullable: true })
    positionAmount: string;

    @Field(() => EnergyModel, { complexity: nestedFieldComplexity })
    energyForWeek: EnergyModel;

    @Field(() => [EsdtTokenPayment], { complexity: nestedFieldComplexity })
    rewardsForWeek: [EsdtTokenPayment];

    @Field(() => [TokenDistributionModel], {
        complexity: nestedFieldComplexity,
    })
    rewardsDistributionForWeek: TokenDistributionModel[];

    constructor(init?: Partial<UserInfoByWeekModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class ClaimProgress {
    @Field(() => EnergyModel, { complexity: nestedFieldComplexity })
    energy: EnergyModel;

    @Field(() => Int)
    week: number;

    constructor(init?: Partial<ClaimProgress>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserInfoByWeekSubModel {
    @Field(() => ClaimProgress, { complexity: nestedFieldComplexity })
    claimProgress: ClaimProgress;

    @Field()
    lastActiveWeekForUser: number;

    constructor(init?: Partial<UserInfoByWeekSubModel>) {
        Object.assign(this, init);
    }
}
