import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BaseFarmModel, FarmRewardType } from './farm.model';
import { GlobalInfoByWeekModel } from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeekTimekeepingModel } from '../../../submodules/week-timekeeping/models/week-timekeeping.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';

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
export class FarmModelV2 extends BaseFarmModel {
    @Field(() => Int)
    boostedYieldsRewardsPercenatage: number;
    @Field(() => BoostedYieldsFactors, { complexity: nestedFieldComplexity })
    boostedYieldsFactors: BoostedYieldsFactors;
    @Field({ nullable: true })
    lockingScAddress: string;
    @Field({ nullable: true })
    lockEpochs: string;
    @Field()
    undistributedBoostedRewards: string;
    @Field()
    undistributedBoostedRewardsClaimed: string;
    @Field()
    energyFactoryAddress: string;
    @Field()
    rewardType: FarmRewardType;
    @Field({ complexity: nestedFieldComplexity })
    time: WeekTimekeepingModel;
    @Field()
    accumulatedRewards: string;
    @Field(() => [GlobalInfoByWeekModel], { complexity: nestedFieldComplexity })
    boosterRewards: [GlobalInfoByWeekModel];
    @Field()
    lastGlobalUpdateWeek: number;
    @Field()
    farmTokenSupplyCurrentWeek: string;
    @Field()
    baseApr: string;
    @Field()
    boostedApr: string;
    @Field()
    optimalEnergyPerLp: string;

    constructor(init?: Partial<FarmModelV2>) {
        super(init);
        Object.assign(this, init);
    }
}
