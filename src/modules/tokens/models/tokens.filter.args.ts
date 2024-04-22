import { ArgsType, Field } from '@nestjs/graphql';
import { PaginationArgs } from 'src/modules/dex.model';

@ArgsType()
export class TokensFiltersArgs {
    @Field(() => [String], { nullable: true })
    identifiers: string;
    @Field({ nullable: true })
    type: string;
    @Field({ defaultValue: false })
    enabledSwaps: boolean;
}

@ArgsType()
export class TokensPaginationArgs extends PaginationArgs {}
