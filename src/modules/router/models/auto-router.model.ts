import { ObjectType, Field } from '@nestjs/graphql';
import { TransactionModel } from 'src/models/transaction.model';
@ObjectType()
export class AutoRouterModel {
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

    @Field(() => [TransactionModel])
    transactions: TransactionModel[];

    constructor(init?: Partial<AutoRouterModel>) {
        Object.assign(this, init);
    }
}
