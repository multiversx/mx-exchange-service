import { Field, ObjectType } from '@nestjs/graphql';
import { PropOptions, raw } from '@nestjs/mongoose';

@ObjectType()
export class WeekTimekeepingModel {
    @Field()
    scAddress: string;

    @Field()
    firstWeekStartEpoch: number;

    @Field()
    currentWeek: number;

    @Field()
    startEpochForWeek: number;

    @Field()
    endEpochForWeek: number;

    constructor(init?: Partial<WeekTimekeepingModel>) {
        Object.assign(this, init);
    }
}

export const WeekTimekeepingPropOptions: PropOptions = {
    type: raw({
        scAddress: { type: String },
        firstWeekStartEpoch: { type: Number },
        currentWeek: { type: Number },
        startEpochForWeek: { type: Number },
        endEpochForWeek: { type: Number },
    }),
    _id: false,
};

@ObjectType()
export class WeekForEpochModel {
    @Field()
    scAddress: string;

    @Field()
    epoch: number;

    @Field()
    week: number;

    constructor(init?: Partial<WeekForEpochModel>) {
        Object.assign(this, init);
    }
}
