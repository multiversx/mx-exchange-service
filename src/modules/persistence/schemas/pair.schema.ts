import { SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { PairModel } from 'src/modules/pair/models/pair.model';

export type PairDocument = PairModel & mongoose.Document;

// const schemaDefinition = DefinitionsFactory.createForClass(EsdtToken);
// export const EsdtTokenSchema = new mongoose.Schema(schemaDefinition, {
//     collection: 'esdt_tokens',
//     toJSON: { getters: true, virtuals: false },
//     toObject: { getters: true, virtuals: false },
// });
export const PairSchema = SchemaFactory.createForClass(PairModel);
