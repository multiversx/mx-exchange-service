import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { EsdtToken } from '../../../models/tokens/esdtToken.model';
import { FarmTokenAttributesModel } from '../../farm/models/farmTokenAttributes.model';
import { NftCollection } from '../../../models/tokens/nftCollection.model';

export enum LockedTokenType {
    LOCKED_LP_TOKEN = 'LockedLpToken',
    LOCKED_FARM_TOKEN = 'LockedFarmToken',
}

registerEnumType(LockedTokenType, {
    name: 'LockedTokenType',
});

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

    constructor(init?: Partial<ProxyModel>) {
        Object.assign(this, init);
    }
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

    constructor(init?: Partial<WrappedFarmTokenAttributesModel>) {
        Object.assign(this, init);
    }
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
    type: LockedTokenType;
    @Field({ nullable: true })
    address: string;

    constructor(init?: Partial<GenericEsdtAmountPair>) {
        Object.assign(this, init);
    }
}
