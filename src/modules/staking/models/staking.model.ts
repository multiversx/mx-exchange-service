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
    pairContractManagedAddress: string;
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
    @Field(() => Int)
    minUnboundEpochs: number;
    @Field()
    perBlockRewards: string;
    @Field(() => Int)
    lastRewardBlockNonce: number;
    @Field()
    rewardsRemainingDays: number;
    @Field()
    divisionSafetyConstant: string;
    @Field()
    produceRewardsEnabled: boolean;
    @Field({ nullable: true })
    lockedAssetFactoryManagedAddress: string;
    @Field({ nullable: true })
    burnGasLimit: string;
    @Field({ nullable: true })
    transferExecGasLimit: string;
    @Field()
    state: string;
    @Field(() => Int)
    deployedAt: number;

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
