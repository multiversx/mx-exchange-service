import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenDocument = EsdtToken & Document;

@Schema()
export class EsdtToken {
    @Prop()
    tokenID: string;
    @Prop()
    type: string;
}

export const EsdtTokenSchema = SchemaFactory.createForClass(EsdtToken);
