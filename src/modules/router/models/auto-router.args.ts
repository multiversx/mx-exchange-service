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
