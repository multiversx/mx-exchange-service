import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EsdtTokenPaymentModel {
    @Field()
    tokenIdentifier: string;
    @Field()
    tokenNonce: number;
    @Field()
    amount: string;

    constructor(init: EsdtTokenPaymentModel) {
        Object.assign(this, init);
    }
}
