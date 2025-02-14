import { ObjectType, Field } from '@nestjs/graphql';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { TransactionModel } from 'src/models/transaction.model';
import { PairModel } from 'src/modules/pair/models/pair.model';

@ObjectType()
export class SwapRouteModel {
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

    @Field()
    maxPriceDeviationPercent: number;

    @Field({ nullable: true })
    tokensPriceDeviationPercent: number;

    @Field(() => [PairModel], { complexity: nestedFieldComplexity })
    pairs: PairModel[];

    @Field()
    tolerance: number;

    constructor(init?: Partial<SwapRouteModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class AutoRouteModel extends SwapRouteModel {
    @Field(() => [TransactionModel], { nullable: true })
    transactions: TransactionModel[];

    @Field(() => [TransactionModel], { nullable: true })
    noAuthTransactions: TransactionModel[];

    constructor(init?: Partial<AutoRouteModel>) {
        super(init);
        Object.assign(this, init);
    }
}

export enum SWAP_TYPE {
    fixedInput = 0,
    fixedOutput = 1,
}
