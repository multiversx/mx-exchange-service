import { Field, Int, ObjectType } from '@nestjs/graphql';
import { LockedAssetAttributesModel } from 'src/modules/locked-asset-factory/models/locked-asset.model';
import { EsdtTokenPaymentModel } from 'src/modules/tokens/models/esdt.token.payment.model';
import { LockedAssetAttributesUnion } from './locked.assets.attributes.union';

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
    @Field(() => Int)
    lockedAssetsNonce: number;
    @Field(() => LockedAssetAttributesModel)
    lockedAssetsAttributes: LockedAssetAttributesModel;

    constructor(init?: Partial<WrappedLpTokenAttributesModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class WrappedLpTokenAttributesModelV2 {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    lpTokenID: string;
    @Field()
    lpTokenAmount: string;
    @Field(() => EsdtTokenPaymentModel)
    lockedTokens: EsdtTokenPaymentModel;
    @Field(() => LockedAssetAttributesUnion)
    lockedAssetsAttributes: typeof LockedAssetAttributesUnion;

    constructor(init?: Partial<WrappedLpTokenAttributesModelV2>) {
        Object.assign(this, init);
    }
}
