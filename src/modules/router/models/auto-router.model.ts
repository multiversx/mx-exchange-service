import { float } from '@elastic/elasticsearch/api/types';
import { ObjectType, Field } from '@nestjs/graphql';
import { bool } from 'aws-sdk/clients/signer';

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
    intermediaryAmounts: string[];

    @Field(() => [String])
    addressRoute: string[];

    @Field()
    tolerance: number;

    @Field(() => [String])
    data: string[];

    constructor(init?: Partial<AutoRouteModel>) {
        Object.assign(this, init);
    }
}
