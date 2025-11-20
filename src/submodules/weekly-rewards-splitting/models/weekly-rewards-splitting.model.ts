import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EnergyModel } from '../../../modules/energy/models/energy.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { Prop, raw, Schema } from '@nestjs/mongoose';

export enum GlobalInfoScType {
    FARM = 'farm',
    STAKING = 'staking',
    FEES_COLLECTOR = 'feesCollector',
}

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
@Schema({ collection: 'rewards_global_info' })
@ObjectType()
export class GlobalInfoByWeekModel {
    @Prop({ index: true })
    @Field()
    scAddress: string;

    @Prop({ enum: GlobalInfoScType })
    scType: string;

    @Prop({ index: true })
    @Field()
    week: number;

    @Prop()
    @Field()
    apr: string;

    @Prop({
        type: raw([
            {
                tokenType: { type: Number },
                tokenID: { type: String },
                nonce: { type: Number },
                amount: { type: String },
            },
        ]),
        _id: false,
        default: [],
    })
    @Field(() => [EsdtTokenPayment], { complexity: nestedFieldComplexity })
    totalRewardsForWeek: EsdtTokenPayment[];

    @Prop({
        type: raw([
            {
                tokenId: { type: String },
                percentage: { type: String },
            },
        ]),
        _id: false,
        default: [],
    })
    @Field(() => [
        TokenDistributionModel,
        { complexity: nestedFieldComplexity },
    ])
    rewardsDistributionForWeek: TokenDistributionModel[];

    @Prop()
    @Field()
    totalEnergyForWeek: string;

    @Prop()
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
