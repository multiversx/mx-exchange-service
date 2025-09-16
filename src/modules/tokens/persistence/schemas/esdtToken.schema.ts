import { SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { EsdtToken } from '../../models/esdtToken.model';

export type EsdtTokenDocument = EsdtToken & mongoose.Document;

// const schemaDefinition = DefinitionsFactory.createForClass(EsdtToken);
// export const EsdtTokenSchema = new mongoose.Schema(schemaDefinition, {
//     collection: 'esdt_tokens',
//     toJSON: { getters: true, virtuals: false },
//     toObject: { getters: true, virtuals: false },
// });
export const EsdtTokenSchema = SchemaFactory.createForClass(EsdtToken);
