import { Field, ObjectType } from '@nestjs/graphql';
import { BaseFarmModel, FarmRewardType } from './farm.model';

@ObjectType()
export class FarmModelV2 extends BaseFarmModel {
    @Field()
    boostedYieldsRewardsPercenatage: number;
    @Field()
    lockingScAddress: string;
    @Field()
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
