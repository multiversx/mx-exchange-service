import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';

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

    @Field(() => [NftCollection], { complexity: nestedFieldComplexity })
    lockedAssetTokens: NftCollection[];

    @Field({ complexity: nestedFieldComplexity })
    wrappedLpToken: NftCollection;

    @Field({ complexity: nestedFieldComplexity })
    wrappedFarmToken: NftCollection;

    @Field({ complexity: nestedFieldComplexity })
    assetToken: EsdtToken;

    @Field(() => [String])
    intermediatedPairs: string[];

    @Field(() => [String])
    intermediatedFarms: string[];

    @Field()
    version: string;

    constructor(init?: Partial<ProxyModel>) {
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
