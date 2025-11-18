import { SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { StakingModel } from 'src/modules/staking/models/staking.model';

export const StakingFarmSchema = SchemaFactory.createForClass(StakingModel);

export type StakingFarmDocument = HydratedDocument<StakingModel>;
