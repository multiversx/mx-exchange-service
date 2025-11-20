import { SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { GlobalInfoByWeekModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';

export const GlobalInfoSchema = SchemaFactory.createForClass(
    GlobalInfoByWeekModel,
);

GlobalInfoSchema.index({ scAddress: 1, week: 1 }, { unique: true });

export type GlobalInfoDocument = HydratedDocument<GlobalInfoByWeekModel>;
