import { ArgsType, Field } from '@nestjs/graphql';
import { SWAP_TYPE } from './auto-route.model';

@ArgsType()
export class MultiSwapTokensArgs {
    @Field()
    swapType: SWAP_TYPE;

    @Field()
    tokenInID: string;

    @Field()
    tokenOutID: string;

    @Field(() => [String])
    tokenRoute: string[];

    @Field(() => [String], {
        nullable: true,
    })
    intermediaryAmounts: string[];

    @Field(() => [String])
    addressRoute: string[];

    @Field()
    tolerance: number;
}
