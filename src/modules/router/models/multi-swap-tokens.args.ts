import { ArgsType, Field } from '@nestjs/graphql';

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