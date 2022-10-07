import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class WeeklyTimekeepingModel {
    @Field()
    scAddress: string;

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

    constructor(init?: Partial<WeeklyTimekeepingModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class WeekForEpochModel {
    @Field()
    scAddress: string;

    @Field()
    epoch: number

    @Field()
    week: number

    constructor(init?: Partial<WeekForEpochModel>) {
        Object.assign(this, init);
    }
}
