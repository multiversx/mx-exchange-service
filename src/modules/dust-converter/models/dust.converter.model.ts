import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { TransactionModel } from 'src/models/transaction.model';

@ObjectType()
export class DustConvertSwapModel {
    @Field()
    dex: string;

    @Field(() => Int, { nullable: true })
    pairId?: number;

    @Field()
    address: string;

    @Field()
    from: string;

    @Field()
    to: string;

    @Field()
    amountIn: string;

    @Field()
    amountOut: string;

    @Field(() => Float)
    amountInShort: number;

    @Field(() => Float)
    amountOutShort: number;

    constructor(init?: Partial<DustConvertSwapModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DustConvertPathModel {
    @Field()
    amountIn: string;

    @Field()
    amountOut: string;

    @Field(() => Float)
    amountInShort: number;

    @Field(() => Float)
    amountOutShort: number;

    @Field(() => Float)
    splitPpm: number;

    @Field(() => [DustConvertSwapModel])
    swaps: DustConvertSwapModel[];

    constructor(init?: Partial<DustConvertPathModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DustConvertRouteModel {
    @Field()
    from: string;

    @Field()
    amountIn: string;

    @Field(() => Float)
    amountInShort: number;

    @Field()
    amountOut: string;

    @Field(() => Float)
    amountOutShort: number;

    @Field(() => [DustConvertPathModel])
    paths: DustConvertPathModel[];

    constructor(init?: Partial<DustConvertRouteModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DustConvertBatchInputModel {
    @Field()
    token: string;

    @Field()
    amount: string;

    @Field(() => Float)
    amountShort: number;

    constructor(init?: Partial<DustConvertBatchInputModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DustConvertBatchModel {
    @Field(() => Int)
    batchIndex: number;

    @Field(() => [DustConvertBatchInputModel])
    inputs: DustConvertBatchInputModel[];

    @Field()
    amountOut: string;

    @Field(() => Float)
    amountOutShort: number;

    @Field()
    amountOutMin: string;

    @Field(() => Float)
    amountOutMinShort: number;

    @Field(() => [DustConvertRouteModel])
    routes: DustConvertRouteModel[];

    @Field(() => [TransactionModel])
    transactions: TransactionModel[];

    constructor(init?: Partial<DustConvertBatchModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DustConvertFailedTokenModel {
    @Field()
    token: string;

    @Field()
    amount: string;

    @Field(() => Float)
    amountShort: number;

    @Field()
    reason: string;

    constructor(init?: Partial<DustConvertFailedTokenModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DustConvertQuoteModel {
    @Field()
    to: string;

    @Field()
    amountOut: string;

    @Field(() => Float)
    amountOutShort: number;

    @Field()
    amountOutMin: string;

    @Field(() => Float)
    amountOutMinShort: number;

    @Field(() => Float)
    slippage: number;

    @Field(() => Int)
    feeBps: number;

    @Field()
    feeAmount: string;

    @Field(() => Float)
    feeAmountShort: number;

    @Field(() => [DustConvertBatchModel])
    batches: DustConvertBatchModel[];

    @Field(() => [DustConvertFailedTokenModel])
    failedTokens: DustConvertFailedTokenModel[];

    constructor(init?: Partial<DustConvertQuoteModel>) {
        Object.assign(this, init);
    }
}
