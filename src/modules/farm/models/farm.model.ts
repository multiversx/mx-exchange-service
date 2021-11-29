import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from '../../../models/tokens/esdtToken.model';
import { NftCollection } from '../../../models/tokens/nftCollection.model';
import { FarmTokenAttributesModel } from './farmTokenAttributes.model';

@ObjectType()
export class RewardsModel {
    @Field(() => FarmTokenAttributesModel)
    decodedAttributes: FarmTokenAttributesModel;
    @Field()
    rewards: string;
    @Field(() => Int, { nullable: true })
    remainingFarmingEpochs?: number;

    constructor(init?: Partial<RewardsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class ExitFarmTokensModel {
    @Field()
    farmingTokens: string;
    @Field()
    rewards: string;

    constructor(init?: Partial<ExitFarmTokensModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmModel {
    @Field()
    address: string;

    @Field()
    farmedToken: EsdtToken;

    @Field()
    farmedTokenPriceUSD: string;

    @Field()
    farmToken: NftCollection;

    @Field()
    farmTokenPriceUSD: string;

    @Field()
    farmingToken: EsdtToken;

    @Field()
    farmingTokenPriceUSD: string;

    @Field()
    perBlockRewards: string;

    @Field()
    farmTokenSupply: string;

    @Field()
    farmingTokenReserve: string;

    @Field(() => Int)
    penaltyPercent: number;

    @Field(() => Int)
    minimumFarmingEpochs: number;

    @Field()
    rewardPerShare: string;

    @Field(() => Int)
    lastRewardBlockNonce: number;

    @Field()
    undistributedFees: string;

    @Field()
    currentBlockFee: string;

    @Field()
    divisionSafetyConstant: string;

    @Field()
    APR: string;

    @Field()
    totalValueLockedUSD: string;

    @Field()
    lockedFarmingTokenReserveUSD: string;

    @Field()
    unlockedFarmingTokenReserveUSD: string;

    @Field()
    state: string;

    constructor(init?: Partial<FarmModel>) {
        Object.assign(this, init);
    }
}
