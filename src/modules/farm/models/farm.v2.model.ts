import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BaseFarmModel, FarmRewardType } from './farm.model';
import { GlobalInfoByWeekModel } from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeekTimekeepingModel } from '../../../submodules/week-timekeeping/models/week-timekeeping.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { Prop, raw, Schema, Virtual } from '@nestjs/mongoose';
import { constantsConfig } from 'src/config';

@ObjectType()
export class BoostedYieldsFactors {
    @Field()
    maxRewardsFactor: string;
    @Field()
    userRewardsEnergy: string;
    @Field()
    userRewardsFarm: string;
    @Field()
    minEnergyAmount: string;
    @Field()
    minFarmAmount: string;

    constructor(init: BoostedYieldsFactors) {
        Object.assign(this, init);
    }
}

@ObjectType()
@Schema({
    collection: 'farms',
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
})
export class FarmModelV2 extends BaseFarmModel {
    @Prop({ default: 0 })
    @Field(() => Int)
    boostedYieldsRewardsPercenatage: number;

    @Prop({
        type: raw({
            maxRewardsFactor: { type: String },
            userRewardsEnergy: { type: String },
            userRewardsFarm: { type: String },
            minEnergyAmount: { type: String },
            minFarmAmount: { type: String },
        }),
        _id: false,
        default: {
            maxRewardsFactor: '0',
            userRewardsEnergy: '0',
            userRewardsFarm: '0',
            minEnergyAmount: '0',
            minFarmAmount: '0',
        },
    })
    @Field(() => BoostedYieldsFactors, { complexity: nestedFieldComplexity })
    boostedYieldsFactors: BoostedYieldsFactors;

    @Prop({ default: null })
    @Field({ nullable: true })
    lockingScAddress: string;

    @Prop({ default: null })
    @Field({ nullable: true })
    lockEpochs: string;

    @Prop({ default: '0' })
    @Field()
    undistributedBoostedRewards: string;

    @Field()
    undistributedBoostedRewardsClaimed: string;

    @Prop({ required: true })
    @Field()
    energyFactoryAddress: string;

    @Prop({ enum: FarmRewardType })
    @Field()
    rewardType: FarmRewardType;

    @Virtual({
        get: function (this: FarmModelV2) {
            const startEpochForWeek =
                this.firstWeekStartEpoch +
                (this.currentWeek - 1) * constantsConfig.EPOCHS_IN_WEEK;
            const endEpochForWeek =
                startEpochForWeek + constantsConfig.EPOCHS_IN_WEEK - 1;

            return new WeekTimekeepingModel({
                currentWeek: this.currentWeek,
                firstWeekStartEpoch: this.firstWeekStartEpoch,
                startEpochForWeek,
                endEpochForWeek,
                scAddress: this.address,
            });
        },
    })
    @Field({ complexity: nestedFieldComplexity })
    time: WeekTimekeepingModel;

    @Field()
    accumulatedRewards: string;

    @Prop({ type: Map, of: String, default: new Map() })
    allAccumulatedRewards: Map<string, string>;

    @Field(() => [GlobalInfoByWeekModel], { complexity: nestedFieldComplexity })
    boosterRewards: [GlobalInfoByWeekModel];

    @Prop()
    @Field()
    lastGlobalUpdateWeek: number;

    @Prop({ default: '0' })
    @Field()
    farmTokenSupplyCurrentWeek: string;

    @Prop({ default: '0' })
    @Field()
    baseApr: string;

    @Prop({ default: '0' })
    @Field()
    boostedApr: string;

    @Prop()
    @Field()
    optimalEnergyPerLp: string;

    @Prop()
    currentWeek: number;

    @Prop()
    firstWeekStartEpoch: number;

    @Prop()
    boostedRewardsPerWeek: string;

    constructor(init?: Partial<FarmModelV2>) {
        super(init);
        Object.assign(this, init);
    }
}
