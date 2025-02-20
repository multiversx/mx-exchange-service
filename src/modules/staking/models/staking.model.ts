import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { StakingTokenAttributesModel } from './stakingTokenAttributes.model';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { BoostedYieldsFactors } from 'src/modules/farm/models/farm.v2.model';
import { BoostedRewardsModel } from 'src/modules/farm/models/farm.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';

@ObjectType()
export class StakingModel {
    @Field()
    address: string;
    @Field({ complexity: nestedFieldComplexity })
    farmToken: NftCollection;
    @Field({ complexity: nestedFieldComplexity })
    farmingToken: EsdtToken;
    @Field({ complexity: nestedFieldComplexity })
    rewardToken: EsdtToken;
    @Field()
    farmTokenSupply: string;
    @Field()
    rewardPerShare: string;
    @Field()
    accumulatedRewards: string;
    @Field()
    rewardCapacity: string;
    @Field()
    annualPercentageRewards: string;
    @Field()
    apr: string;
    @Field()
    aprUncapped: string;
    @Field()
    boostedApr: string;
    @Field(() => Int)
    minUnboundEpochs: number;
    @Field()
    perBlockRewards: string;
    @Field(() => Int)
    lastRewardBlockNonce: number;
    @Field()
    rewardsRemainingDays: number;
    @Field()
    rewardsRemainingDaysUncapped: number;
    @Field()
    divisionSafetyConstant: string;
    @Field()
    produceRewardsEnabled: boolean;
    @Field({ nullable: true })
    lockedAssetFactoryManagedAddress: string;
    @Field()
    state: string;
    @Field(() => Int, { description: 'The percentage of boosted rewards' })
    boostedYieldsRewardsPercenatage: number;
    @Field(() => BoostedYieldsFactors, {
        description: 'Factors used to compute boosted rewards',
        complexity: nestedFieldComplexity,
    })
    boostedYieldsFactors: BoostedYieldsFactors;
    @Field({ description: 'Optimal energy for staking position' })
    optimalEnergyPerStaking: string;
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
    @Field()
    lastGlobalUpdateWeek: number;
    @Field()
    farmTokenSupplyCurrentWeek: string;
    @Field()
    energyFactoryAddress: string;
    @Field({ description: 'Accumulated boosted rewards for specific week' })
    accumulatedRewardsForWeek: string;
    @Field()
    undistributedBoostedRewards: string;
    @Field()
    undistributedBoostedRewardsClaimed: string;
    @Field({
        description:
            'The nonce of the first staking farm token with total farm position',
    })
    stakingPositionMigrationNonce: number;
    @Field(() => Int)
    deployedAt: number;

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
