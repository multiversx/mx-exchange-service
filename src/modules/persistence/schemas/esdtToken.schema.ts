import { SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

export type EsdtTokenDocument = EsdtToken & mongoose.Document;

export const EsdtTokenSchema = SchemaFactory.createForClass(EsdtToken);
