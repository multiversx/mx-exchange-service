import { ArgsType, Field } from '@nestjs/graphql';
import { InputTokenModel } from 'src/models/inputToken.model';

@ArgsType()
export class AddLiquidityArgs {
    @Field()
    pairAddress: string;
    @Field(() => [InputTokenModel])
    tokens: Array<InputTokenModel>;
    @Field()
    tolerance: number;
}

@ArgsType()
export class RemoveLiquidityArgs {
    @Field()
    pairAddress: string;
    @Field()
    liquidity: string;
    @Field()
    liquidityTokenID: string;
    @Field()
    tolerance: number;
}

@ArgsType()
export class SwapTokensFixedInputArgs {
    @Field()
    pairAddress: string;
    @Field()
    tokenInID: string;
    @Field()
    amountIn: string;
    @Field()
    tokenOutID: string;
    @Field()
    amountOut: string;
    @Field()
    tolerance: number;
}

@ArgsType()
export class SwapTokensFixedOutputArgs {
    @Field()
    pairAddress: string;
    @Field()
    tokenInID: string;
    @Field()
    amountIn: string;
    @Field()
    tokenOutID: string;
    @Field()
    amountOut: string;
}
