import { Field, ArgsType, Int } from '@nestjs/graphql';
import { Expose } from 'class-transformer';

@ArgsType()
export class PaginationArgs {
    @Expose()
    @Field(() => Int)
    offset = 0;

    @Expose()
    @Field(() => Int)
    limit = 10;

    constructor(init: Partial<PaginationArgs>) {
        Object.assign(this, init);
    }
}
