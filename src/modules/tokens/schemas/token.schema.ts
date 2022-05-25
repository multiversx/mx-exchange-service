import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenDocument = EsdtTokenDbModel & Document;

@Schema()
export class EsdtTokenDbModel {
    @Prop()
    tokenID: string;
    @Prop()
    type: string;
}

export const EsdtTokenSchema = SchemaFactory.createForClass(EsdtTokenDbModel);
