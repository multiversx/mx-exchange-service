import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BoYAccount {
    @Field()
    address: string;
    @Field()
    netWorth: number;

    constructor(init?: Partial<BoYAccount>) {
        Object.assign(this, init);
    }
}
