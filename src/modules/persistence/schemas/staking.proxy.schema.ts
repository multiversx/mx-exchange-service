import { SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';

export const StakingProxySchema =
    SchemaFactory.createForClass(StakingProxyModel);

export type StakingProxyDocument = HydratedDocument<StakingProxyModel>;
