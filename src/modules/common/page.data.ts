import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

@ObjectType()
export default class PageData {
    @Field(() => Int)
    public count: number;

    @Field(() => Int)
    public limit: number;

    @Field(() => Int)
    public offset: number;
}

export enum SortingOrder {
    ASC = 'ascending',
    DESC = 'descending',
}

registerEnumType(SortingOrder, { name: 'SortingOrder' });
