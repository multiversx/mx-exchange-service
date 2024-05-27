import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export default class PageData {
    @Field(() => Int)
    public count: number;

    @Field(() => Int)
    public limit: number;

    @Field(() => Int)
    public offset: number;
}
