import { Field, ArgsType, Int } from '@nestjs/graphql';

@ArgsType()
export class TokensTransferArgs {
    @Field()
    pairAddress: string;
    @Field()
    amount: string;
    @Field()
    tokenID: string;
    @Field(type => Int, { nullable: true })
    tokenNonce?: number;
    @Field({ nullable: true }) sender?: string;
}

@ArgsType()
export class AddLiquidityProxyArgs {
    @Field() pairAddress: string;
    @Field() amount0: string;
    @Field() amount1: string;
    @Field() tolerance: number;
    @Field() token0ID: string;
    @Field() token1ID: string;
    @Field(type => Int, { nullable: true })
    token0Nonce?: number;
    @Field(type => Int, { nullable: true })
    token1Nonce?: number;
}

@ArgsType()
export class AddLiquidityProxyBatchArgs {
    @Field()
    pairAddress: string;
    @Field()
    firstTokenAmount: string;
    @Field()
    firstTokenID: string;
    @Field(type => Int, { nullable: true })
    firstTokenNonce?: number;
    @Field()
    secondTokenAmount: string;
    @Field()
    secondTokenID: string;
    @Field(type => Int, { nullable: true })
    secondTokenNonce?: number;
    @Field({ nullable: true }) sender?: string;
    @Field() tolerance: number;
}

@ArgsType()
export class RemoveLiquidityProxyArgs {
    @Field() sender: string;
    @Field() pairAddress: string;
    @Field() wrappedLpTokenID: string;
    @Field(type => Int)
    wrappedLpTokenNonce: number;
    @Field() liquidity: string;
    @Field() tolerance: number;
}

@ArgsType()
export class ReclaimTemporaryFundsProxyArgs {
    @Field()
    sender: string;
    @Field() firstTokenID: string;
    @Field(type => Int, { nullable: true })
    firstTokenNonce?: number;
    @Field({ nullable: true })
    firstTokenAmount?: string;
    @Field() secondTokenID: string;
    @Field(type => Int, { nullable: true })
    secondTokenNonce?: number;
    @Field({ nullable: true })
    secondTokenAmount?: string;
}
