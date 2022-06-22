import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FlagModel {
    @Field()
    name: string;
    @Field()
    value: boolean;

    constructor(init?: Partial<FlagModel>) {
        Object.assign(this, init);
    }
}
