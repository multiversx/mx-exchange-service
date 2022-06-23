import { ObjectType, Field } from '@nestjs/graphql';
import { TransactionModel } from 'src/models/transaction.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
@ObjectType()
export class AutoRouteModel {
    @Field()
    swapType: SWAP_TYPE;

    @Field()
    tokenInID: string;

    @Field()
    tokenOutID: string;

    @Field()
    tokenInExchangeRate: string;

    @Field()
    tokenOutExchangeRate: string;

    @Field()
    tokenInExchangeRateDenom: string;

    @Field()
    tokenOutExchangeRateDenom: string;

    @Field()
    tokenInPriceUSD: string;

    @Field()
    tokenOutPriceUSD: string;

    @Field({ nullable: true })
    amountIn: string;

    @Field({ nullable: true })
    amountOut: string;

    @Field(() => [String])
    intermediaryAmounts: string[];

    @Field(() => [String])
    tokenRoute: string[];

    @Field(() => [String])
    fees: string[];

    @Field(() => [String])
    pricesImpact: string[];

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

export enum SWAP_TYPE {
    fixedInput = 0,
    fixedOutput = 1,
}
