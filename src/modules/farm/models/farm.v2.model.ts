import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BaseFarmModel, FarmRewardType } from './farm.model';

@ObjectType()
export class BoostedYieldsFactors {
    @Field()
    userRewardsBase: string;
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
    @Field(() => BoostedYieldsFactors)
    boostedYieldsFactors: BoostedYieldsFactors;
    @Field({ nullable: true })
    lockingScAddress: string;
    @Field({ nullable: true })
    lockEpochs: string;
    @Field()
    undistributedBoostedRewards: string;
    @Field()
    energyFactoryAddress: string;
    @Field()
    rewardType: FarmRewardType;

    constructor(init?: Partial<FarmModelV2>) {
        super(init);
        Object.assign(this, init);
    }
}
