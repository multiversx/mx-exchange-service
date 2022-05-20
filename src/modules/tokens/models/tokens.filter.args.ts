import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class TokensFiltersArgs {
    @Field(() => [String], { nullable: true })
    identifiers: string;
}
