import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AnalyticsModel {
    @Field()
    name: string;
    @Field()
    value: string;

    constructor(init?: Partial<AnalyticsModel>) {
        Object.assign(this, init);
    }
}
