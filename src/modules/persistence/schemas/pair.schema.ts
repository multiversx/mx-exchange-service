import { PairModel } from 'src/modules/pair/models/pair.model';
import * as mongoose from 'mongoose';
import { SchemaFactory } from '@nestjs/mongoose';

export type PairDocument = PairModel & mongoose.Document;

export const PairSchema = SchemaFactory.createForClass(PairModel);
