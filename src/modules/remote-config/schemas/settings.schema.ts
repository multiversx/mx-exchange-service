import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingsDocument = Settings & Document;

@Schema()
export class Settings {
    @Prop()
    name: string;
    @Prop()
    value: string;
    @Prop()
    category: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings).index(
    {
        name: 1,
    },
    { unique: true },
);
