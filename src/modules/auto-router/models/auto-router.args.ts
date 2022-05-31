import { Field, ArgsType } from '@nestjs/graphql';

@ArgsType()
export class AutoRouterArgs {
    @Field()
    tokenInID: string;

    @Field()
    tokenOutID: string;

    @Field({ nullable: true })
    amountIn?: string;

    @Field({ nullable: true })
    amountOut?: string;

    @Field()
    tolerance: number;
}
