import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

@ObjectType()
export default class PageData {
    @Field(() => Int, { complexity: 0 })
    public count: number;

    @Field(() => Int, { complexity: 0 })
    public limit: number;

    @Field(() => Int, { complexity: 0 })
    public offset: number;
}

export enum SortingOrder {
    ASC = 'ascending',
    DESC = 'descending',
}

registerEnumType(SortingOrder, { name: 'SortingOrder' });
