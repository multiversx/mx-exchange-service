import { SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';

export const FarmSchema = SchemaFactory.createForClass(FarmModelV2);

export type FarmDocument = HydratedDocument<FarmModelV2>;
