import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PairDocument = Pair & Document;

@Schema()
export class Pair {
    @Prop()
    address: string;
    @Prop()
    type: string;
}

export const PairSchema = SchemaFactory.createForClass(Pair);
