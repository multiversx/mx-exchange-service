import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { StakingTokenAttributesModel } from './stakingTokenAttributes.model';
import {
    WeekTimekeepingModel,
    WeekTimekeepingPropOptions,
} from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import {
    BoostedYieldsFactors,
    BoostedYieldsFactorsPropOptions,
} from 'src/modules/farm/models/farm.v2.model';
import { BoostedRewardsModel } from 'src/modules/farm/models/farm.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({
    collection: 'staking_farms',
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
})
@ObjectType()
export class StakingModel {
    @Prop({ unique: true })
    @Field()
    address: string;

    @Field({ complexity: nestedFieldComplexity })
    farmToken: NftCollection;

    @Prop()
    farmTokenCollection: string;

    @Prop({ default: 18 })
    farmTokenDecimals: number;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EsdtToken',
        index: true,
        required: true,
    })
    @Field({ complexity: nestedFieldComplexity })
    farmingToken: EsdtToken;

    @Prop()
    farmingTokenID: string;

    @Prop({ default: '0' })
    farmingTokenPriceUSD: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EsdtToken',
        index: true,
        required: true,
    })
    @Field({ complexity: nestedFieldComplexity })
    rewardToken: EsdtToken;

    @Prop()
    rewardTokenID: string;

    @Prop({ default: '0' })
    @Field()
    farmTokenSupply: string;

    @Prop({ default: '0' })
    @Field()
    rewardPerShare: string;

    @Prop({ default: '0' })
    @Field()
    accumulatedRewards: string;

    @Prop({ default: '0' })
    @Field()
    rewardCapacity: string;

    @Prop({ default: '0' })
    @Field()
    annualPercentageRewards: string;

    @Prop({ default: '0' })
    @Field()
    apr: string;

    @Prop({ default: '0' })
    @Field()
    aprUncapped: string;

    @Prop({ default: '0' })
    @Field()
    boostedApr: string;

    @Prop({ default: '0' })
    baseApr: string;

    @Prop({ default: '0' })
    maxBoostedApr: string;

    @Prop({ default: 0 })
    @Field(() => Int)
    minUnboundEpochs: number;

    @Prop({ default: '0' })
    @Field()
    perBlockRewards: string;

    @Prop({ default: 0 })
    @Field(() => Int)
    lastRewardBlockNonce: number;

    @Prop({ default: 0 })
    @Field()
    rewardsRemainingDays: number;

    @Prop({ default: 0 })
    @Field()
    rewardsRemainingDaysUncapped: number;

    @Prop({ default: '0' })
    @Field()
    divisionSafetyConstant: string;

    @Prop({ default: false })
    @Field()
    produceRewardsEnabled: boolean;

    @Prop()
    @Field({ nullable: true })
    lockedAssetFactoryManagedAddress: string;

    @Prop({ index: true })
    @Field()
    state: string;

    @Prop({ default: 0 })
    @Field(() => Int, { description: 'The percentage of boosted rewards' })
    boostedYieldsRewardsPercenatage: number;

    @Prop(BoostedYieldsFactorsPropOptions)
    @Field(() => BoostedYieldsFactors, {
        description: 'Factors used to compute boosted rewards',
        complexity: nestedFieldComplexity,
    })
    boostedYieldsFactors: BoostedYieldsFactors;

    @Prop()
    @Field({ description: 'Optimal energy for staking position' })
    optimalEnergyPerStaking: string;

    @Prop(WeekTimekeepingPropOptions)
    @Field({
        description: 'Timekeeping for boosted rewards',
        complexity: nestedFieldComplexity,
    })
    time: WeekTimekeepingModel;

    @Field(() => [GlobalInfoByWeekModel], {
        description: 'Global info for boosted rewards',
        complexity: nestedFieldComplexity,
    })
    boosterRewards: [GlobalInfoByWeekModel];

    @Prop()
    @Field()
    lastGlobalUpdateWeek: number;

    @Prop()
    @Field()
    farmTokenSupplyCurrentWeek: string;

    @Prop()
    @Field()
    energyFactoryAddress: string;

    @Field({ description: 'Accumulated boosted rewards for specific week' })
    accumulatedRewardsForWeek: string;

    @Prop({ type: Map, of: String, default: new Map() })
    allAccumulatedRewards: Map<string, string>;

    @Prop({ default: '0' })
    @Field()
    undistributedBoostedRewards: string;

    @Field()
    undistributedBoostedRewardsClaimed: string;

    @Prop()
    @Field({
        description:
            'The nonce of the first staking farm token with total farm position',
    })
    stakingPositionMigrationNonce: number;

    @Prop()
    @Field(() => Int)
    deployedAt: number;

    @Prop({ default: '0' })
    rewardsPerBlockAPRBound: string;

    @Prop({ default: true })
    isProducingRewards: boolean;

    @Prop({ default: '0' })
    stakedValueUSD: string;

    constructor(init?: Partial<StakingModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class StakingRewardsModel {
    @Field(() => StakingTokenAttributesModel, {
        complexity: nestedFieldComplexity,
    })
    decodedAttributes: StakingTokenAttributesModel;
    @Field()
    rewards: string;
    @Field(() => Int, { nullable: true })
    remainingFarmingEpochs?: number;
    @Field(() => [UserInfoByWeekModel], {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    boostedRewardsWeeklyInfo: UserInfoByWeekModel[];
    @Field(() => ClaimProgress, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    claimProgress: ClaimProgress;
    @Field({ nullable: true })
    accumulatedRewards: string;

    constructor(init?: Partial<StakingRewardsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class StakingBoostedRewardsModel extends BoostedRewardsModel {
    constructor(init?: Partial<StakingBoostedRewardsModel>) {
        super(init);
    }
}

@ObjectType()
export class OptimalCompoundModel {
    @Field(() => Int, {
        description: 'The optimal number of compounds in the given interval',
    })
    interval: number;
    @Field()
    optimalProfit: number;
    @Field(() => Int)
    days: number;
    @Field(() => Int)
    hours: number;
    @Field(() => Int)
    minutes: number;

    constructor(init?: Partial<OptimalCompoundModel>) {
        Object.assign(this, init);
    }
}
