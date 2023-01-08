import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalyticsDocument = Analytics & Document;

@Schema()
export class Analytics {
    @Prop()
    name: string;
    @Prop()
    value: string;
}

export const AnalyticsSchema = SchemaFactory.createForClass(Analytics).index(
    {
        name: 1,
    },
    { unique: true },
);
