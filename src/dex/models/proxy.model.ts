import { ObjectType, Field, Int } from '@nestjs/graphql';
import { TokenModel } from './pair.model';

@ObjectType()
export class ProxyModel {
    @Field()
    address: string;

    @Field()
    wrappedLpToken: TokenModel;

    @Field()
    wrappedFarmToken: TokenModel;

    @Field(type => TokenModel)
    lockedAssetToken: TokenModel;

    @Field(type => [String])
    intermediatedPairs: string[];

    @Field(type => [String])
    intermediatedFarms: string[];
}

@ObjectType()
export class WrappedLpTokenAttributesModel {
    @Field()
    lpTokenID: string;
    @Field()
    lpTokenTotalAmount: string;
    @Field()
    lockedAssetsTokenID: string;
    @Field()
    lockedAssetsInvested: string;
    @Field(type => Int)
    lockedAssetsNonce: number;
}

@ObjectType()
export class WrappedFarmTokenAttributesModel {
    @Field()
    farmTokenID: string;
    @Field(type => Int)
    farmTokenNonce: number;
    @Field()
    farmedTokenID: string;
    @Field(type => Int)
    farmedTokenNonce: number;
}
