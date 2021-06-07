import { ObjectType, Field, Int } from '@nestjs/graphql';
import { TokenModel } from './esdtToken.model';
import { NFTTokenModel } from './nftToken.model';

@ObjectType()
export class ProxyModel {
    @Field()
    address: string;

    @Field()
    wrappedLpToken: NFTTokenModel;

    @Field()
    wrappedFarmToken: NFTTokenModel;

    @Field()
    assetToken: TokenModel;

    @Field()
    lockedAssetToken: NFTTokenModel;

    @Field(type => [String])
    intermediatedPairs: string[];

    @Field(type => [String])
    intermediatedFarms: string[];
}

@ObjectType()
export class WrappedLpTokenAttributesModel {
    @Field()
    attributes: string;
    @Field()
    lpTokenID: string;
    @Field()
    lpTokenTotalAmount: string;
    @Field()
    lockedAssetsInvested: string;
    @Field(type => Int)
    lockedAssetsNonce: number;
}

@ObjectType()
export class WrappedFarmTokenAttributesModel {
    @Field()
    attributes: string;
    @Field()
    farmTokenID: string;
    @Field(type => Int)
    farmTokenNonce: number;
    @Field()
    farmedTokenID: string;
    @Field(type => Int)
    farmedTokenNonce: number;
}

@ObjectType()
export class GenericEsdtAmountPair {
    @Field()
    tokenID: string;
    @Field()
    tokenNonce: string;
    @Field()
    amount: string;
}
