import { ArgsType, Field } from '@nestjs/graphql';
import { PaginationArgs } from 'src/modules/dex.model';

@ArgsType()
export class UserTokensArgs extends PaginationArgs {
    @Field()
    address: string;
}
