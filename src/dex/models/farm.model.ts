import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TokenModel } from './pair.model';

@ObjectType()
export class FarmTokenAttributesModel {
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
export class FarmModel {
    @Field()
    address: string;

    @Field()
    farmedToken: TokenModel;

    @Field()
    farmToken: TokenModel;

    @Field()
    farmingToken: TokenModel;

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
