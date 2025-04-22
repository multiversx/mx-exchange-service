import { Field, ArgsType, Int } from '@nestjs/graphql';
import { Max } from 'class-validator';

@ArgsType()
export class PaginationArgs {
    @Field(() => Int)
    offset = 0;

    @Max(1000)
    @Field(() => Int)
    limit = 10;

    constructor(init: Partial<PaginationArgs>) {
        Object.assign(this, init);
    }
}
