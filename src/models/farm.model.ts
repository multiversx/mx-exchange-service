import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from './tokens/esdtToken.model';
import { NftToken } from './tokens/nftToken.model';

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
}

@ObjectType()
export class RewardsModel {
    @Field(type => FarmTokenAttributesModel)
    decodedAttributes: FarmTokenAttributesModel;
    @Field()
    rewards: string;
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
    farmToken: NftToken;

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

    @Field()
    APR: string;

    @Field()
    state: string;
}
