import { Field, ArgsType, Int } from '@nestjs/graphql';
import { InputTokenModel } from 'src/models/inputToken.model';

@ArgsType()
export class AddLiquidityProxyArgs {
    @Field()
    pairAddress: string;
    @Field(() => [InputTokenModel])
    tokens: Array<InputTokenModel>;
    @Field()
    tolerance: number;
}

@ArgsType()
export class RemoveLiquidityProxyArgs {
    @Field() pairAddress: string;
    @Field() wrappedLpTokenID: string;
    @Field(() => Int)
    wrappedLpTokenNonce: number;
    @Field() liquidity: string;
    @Field() tolerance: number;
}
