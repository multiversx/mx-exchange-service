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
    @Field() firstTokenID: string;
    @Field() secondTokenID: string;
    @Field(type => Int, { nullable: true })
    firstTokenNonce?: number;
    @Field(type => Int, { nullable: true })
    secondTokenNonce?: number;
}
