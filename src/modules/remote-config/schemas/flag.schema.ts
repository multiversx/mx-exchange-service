import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FlagDocument = Flag & Document;

@Schema()
export class Flag {
    @Prop()
    name: string;
    @Prop()
    value: boolean;
}

export const FlagSchema = SchemaFactory.createForClass(Flag).index(
    {
        name: 1,
    },
    { unique: true },
);
