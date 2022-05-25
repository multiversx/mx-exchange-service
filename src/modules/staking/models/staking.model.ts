import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { StakingTokenAttributesModel } from './stakingTokenAttributes.model';

@ObjectType()
export class StakingModel {
    @Field()
    address: string;
    @Field()
    farmToken: NftCollection;
    @Field()
    farmingToken: EsdtToken;
    @Field()
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
    @Field(() => Int)
    minUnboundEpochs: number;
    @Field(() => Int)
    penaltyPercent: number;
    @Field(() => Int)
    minimumFarmingEpochs: number;
    @Field()
    perBlockRewards: string;
    @Field(() => Int)
    lastRewardBlockNonce: number;
    @Field()
    divisionSafetyConstant: string;
    @Field()
    produceRewardsEnabled: boolean;
    @Field()
    state: string;

    constructor(init?: Partial<StakingModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class StakingRewardsModel {
    @Field(() => StakingTokenAttributesModel)
    decodedAttributes: StakingTokenAttributesModel;
    @Field()
    rewards: string;

    constructor(init?: Partial<StakingRewardsModel>) {
        Object.assign(this, init);
    }
}
