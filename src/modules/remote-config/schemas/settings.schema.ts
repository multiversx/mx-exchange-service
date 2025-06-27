import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SettingsCategoryEnum } from '../models/settings.model';
import { Document } from 'mongoose';

export type SettingsDocument = Settings & Document;

@Schema()
export class Settings {
    @Prop()
    name: string;
    @Prop()
    value: string;
    @Prop()
    category: SettingsCategoryEnum;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings).index(
    {
        name: 1,
    },
    { unique: true },
);
