import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from '../../../models/tokens/esdtToken.model';
import { NftCollection } from '../../../models/tokens/nftCollection.model';

@ObjectType()
export class FarmTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    rewardPerShare: string;
    @Field(type => Int)
    enteringEpoch: number;
    @Field(type => Int)
    aprMultiplier: number;
    @Field()
    lockedRewards: boolean;
    @Field()
    initialFarmingAmount: string;
    @Field()
    compoundedReward: string;
    @Field()
    currentFarmAmount: string;

    constructor(init?: Partial<FarmTokenAttributesModel>) {
        Object.assign(this, init);
    }

    static fromDecodedAttributes(
        decodedAttributes: any,
    ): FarmTokenAttributesModel {
        return new FarmTokenAttributesModel({
            rewardPerShare: decodedAttributes.rewardPerShare.toString(),
            enteringEpoch: decodedAttributes.enteringEpoch.toNumber(),
            aprMultiplier: decodedAttributes.aprMultiplier.toNumber(),
            lockedRewards: decodedAttributes.withLockedRewards,
            initialFarmingAmount: decodedAttributes.initialFarmingAmount.toFixed(),
            compoundedReward: decodedAttributes.compoundedReward.toFixed(),
            currentFarmAmount: decodedAttributes.currentFarmAmount.toFixed(),
        });
    }
}

@ObjectType()
export class RewardsModel {
    @Field(type => FarmTokenAttributesModel)
    decodedAttributes: FarmTokenAttributesModel;
    @Field()
    rewards: string;
    @Field(type => Int, { nullable: true })
    remainingFarmingEpochs?: number;

    constructor(init?: Partial<RewardsModel>) {
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

    @Field(type => Int)
    penaltyPercent: number;

    @Field(type => Int)
    minimumFarmingEpochs: number;

    @Field()
    APR: string;

    @Field(type => Int)
    nftDepositMaxLen: number;

    @Field(type => [String])
    nftDepositAcceptedTokenIDs: string[];

    @Field()
    state: string;

    constructor(init?: Partial<FarmModel>) {
        Object.assign(this, init);
    }
}
