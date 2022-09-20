import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalyticsReindexStateDocument = AnalyticsReindexState & Document;

export class PairState {
    firstTokenID: string;
    secondTokenID: string;
    firstTokenReserves: string;
    secondTokenReserves: string;
    liquidityPoolSupply: string;
}

@Schema()
@ObjectType()
export class AnalyticsReindexState {
    @Prop(
        raw({
            type: Array,
            of: PairState,
        }),
    )
    pairsState: { [key: string]: PairState };
    @Prop()
    @Field()
    lastIntervalStartDate: string;

    constructor(init?: Partial<AnalyticsReindexState>) {
        Object.assign(this, init);
        this.pairsState = {};
    }
}

export const AnalyticsReindexStateSchema = SchemaFactory.createForClass(
    AnalyticsReindexState,
);
