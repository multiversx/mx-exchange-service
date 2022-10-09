import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class WeekTimekeepingModel {
    @Field()
    scAddress: string;

    @Field()
    type: string;

    @Field()
    firstWeekStartEpoch: number

    @Field()
    currentWeek: number

    @Field()
    week: number;

    @Field()
    startEpochForWeek: number;

    @Field()
    endEpochForWeek: number;

    constructor(init?: Partial<WeekTimekeepingModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class WeekForEpochModel {
    @Field()
    scAddress: string;

    @Field()
    type: string;

    @Field()
    epoch: number

    @Field()
    week: number

    constructor(init?: Partial<WeekForEpochModel>) {
        Object.assign(this, init);
    }
}
