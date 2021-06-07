import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TokenModel } from './esdtToken.model';
import { NFTTokenModel } from './nftToken.model';

@ObjectType()
export class FarmModel {
    @Field()
    address: string;

    @Field()
    farmedToken: TokenModel;

    @Field()
    farmToken: NFTTokenModel;

    @Field()
    farmTokenPriceUSD: string;

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

@ObjectType()
export class FarmTokenAttributesModel {
    @Field()
    totalEnteringAmount: string;
    @Field()
    totalLiquidityAmount: string;
    @Field(type => Int)
    enteringEpoch: number;
    @Field(type => Int)
    liquidityMultiplier: number;
    @Field()
    lockedRewards: boolean;
}
