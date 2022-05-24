import { Field, ArgsType } from '@nestjs/graphql';

@ArgsType()
export class AutoRouterArgs {
    @Field()
    tokenInID: string;

    @Field()
    tokenOutID: string;

    @Field()
    amount: string;

    @Field()
    tolerance: number;
}

@ArgsType()
export class MultiSwapTokensArgs {
    @Field()
    tokenInID: string;

    @Field()
    tokenOutID: string;

    @Field(() => [String])
    tokenRoute: string[];

    @Field(() => [String])
    intermediaryAmounts: string[];

    @Field(() => [String])
    addressRoute: string[];

    @Field()
    tolerance: number;
}
