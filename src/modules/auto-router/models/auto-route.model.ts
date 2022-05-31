import { ObjectType, Field } from '@nestjs/graphql';
import { TransactionModel } from 'src/models/transaction.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
@ObjectType()
export class AutoRouteModel {
    sender: string;

    @Field()
    tokenInID: string;

    @Field()
    tokenOutID: string;

    @Field()
    tokenInPrice: string;

    @Field()
    tokenOutPrice: string;

    @Field({ nullable: true })
    amountIn: string;

    @Field({ nullable: true })
    amountOut: string;

    @Field(() => [String])
    intermediaryAmounts: string[];

    @Field(() => [String])
    tokenRoute: string[];

    @Field(() => [PairModel])
    pairs: PairModel[];

    @Field()
    tolerance: number;

    @Field(() => [TransactionModel], { nullable: true })
    transactions: TransactionModel[];

    constructor(init?: Partial<AutoRouteModel>) {
        Object.assign(this, init);
    }
}
