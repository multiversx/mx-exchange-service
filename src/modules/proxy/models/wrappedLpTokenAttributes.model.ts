import { Field, Int, ObjectType } from '@nestjs/graphql';

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

    constructor(init?: Partial<WrappedLpTokenAttributesModel>) {
        Object.assign(this, init);
    }
}
