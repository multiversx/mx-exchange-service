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
export class RemoveLiquidityAndBuyBackAndBurnArgs {
    @Field()
    pairAddress: string;
    @Field()
    amount: string;
    @Field()
    tokenInID: string;
    @Field()
    tokenToBuyBackAndBurnID: string;
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

@ArgsType()
export class SwapNoFeeAndForwardArgs {
    @Field()
    pairAddress: string;
    @Field()
    tokenOutID: string;
    @Field()
    destination: string;
}

@ArgsType()
export class SetLpTokenIdentifierArgs {
    @Field()
    pairAddress: string;
    @Field()
    tokenID: string;
}

@ArgsType()
export class WhitelistArgs {
    @Field()
    pairAddress: string;
    @Field()
    address: string;
}
