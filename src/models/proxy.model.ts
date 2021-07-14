import { ObjectType, Field, Int } from '@nestjs/graphql';
import { EsdtToken } from './tokens/esdtToken.model';
import { FarmTokenAttributesModel } from './farm.model';
import { NftCollection } from './tokens/nftCollection.model';

@ObjectType()
export class ProxyModel {
    @Field()
    address: string;

    @Field()
    wrappedLpToken: NftCollection;

    @Field()
    wrappedFarmToken: NftCollection;

    @Field()
    assetToken: EsdtToken;

    @Field()
    lockedAssetToken: NftCollection;

    @Field(type => [String])
    intermediatedPairs: string[];

    @Field(type => [String])
    intermediatedFarms: string[];

    @Field(type => Int)
    nftDepositMaxLen: number;

    @Field(type => [String])
    nftDepositAcceptedTokenIDs: string[];
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
    farmTokenAmount: string;
    @Field()
    farmTokenIdentifier: string;
    @Field(type => FarmTokenAttributesModel)
    farmTokenAttributes: FarmTokenAttributesModel;
    @Field()
    farmingTokenID: string;
    @Field()
    farmingTokenNonce: string;
    @Field()
    farmingTokenAmount: string;
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
