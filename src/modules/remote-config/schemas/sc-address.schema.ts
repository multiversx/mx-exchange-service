import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SCAddressType } from '../models/sc-address.model';

export type SCAddressDocument = SCAddress & Document;

@Schema()
export class SCAddress {
    @Prop()
    address: string;
    @Prop(() => SCAddressType)
    category: SCAddressType;
}

export const SCAddressSchema = SchemaFactory.createForClass(SCAddress).index(
    {
        address: 1,
    },
    { unique: true },
);
