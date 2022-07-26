import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class TokensFiltersArgs {
    @Field(() => [String], { nullable: true })
    identifiers: string;
    @Field({ nullable: true })
    type: string;
    @Field({ defaultValue: false })
    enabledSwaps: boolean;
}
