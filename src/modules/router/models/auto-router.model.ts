import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class AutoRouteModel {
    @Field()
    tokenInID: string;

    @Field()
    tokenOutID: string;

    @Field()
    amountIn: string;

    @Field()
    amountOut: string;

    @Field(() => [String])
    tokenRoute: string[];

    @Field(() => [String])
    addressRoute: string[];

    constructor(init?: Partial<AutoRouteModel>) {
        Object.assign(this, init);
    }
}
