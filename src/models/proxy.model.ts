import { ObjectType, Field, Int } from '@nestjs/graphql';
import { EsdtToken } from './tokens/esdtToken.model';
import { FarmTokenAttributesModel } from './farm.model';
import { NftCollectionToken } from './tokens/nftToken.model';

@ObjectType()
export class ProxyModel {
    @Field()
    address: string;

    @Field()
    wrappedLpToken: NftCollectionToken;

    @Field()
    wrappedFarmToken: NftCollectionToken;

    @Field()
    assetToken: EsdtToken;

    @Field()
    lockedAssetToken: NftCollectionToken;

    @Field(type => [String])
    intermediatedPairs: string[];

    @Field(type => [String])
    intermediatedFarms: string[];
}

@ObjectType()
export class WrappedLpTokenAttributesModel {
    @Field()
    identifier: string;
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
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    farmTokenID: string;
    @Field(type => Int)
    farmTokenNonce: number;
    @Field()
    farmTokenIdentifier: string;
    @Field(type => FarmTokenAttributesModel)
    farmTokenAttributes: FarmTokenAttributesModel;
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
    @Field({ nullable: true })
    pairAddress: string;
}
