import { Field, ArgsType, Int } from '@nestjs/graphql';

@ArgsType()
export class PaginationArgs {
    @Field(() => Int)
    offset = 0;

    @Field(() => Int)
    limit = 10;

    constructor(init: Partial<PaginationArgs>) {
        Object.assign(this, init);
    }
}
