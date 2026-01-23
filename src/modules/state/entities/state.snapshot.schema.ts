import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

@Schema({
    collection: 'state_snapshots',
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
})
export class StateSnapshot {
    @Prop({ unique: true })
    blockNonce: number;

    @Prop({ type: mongoose.Schema.Types.Date, unique: true })
    date: Date;

    @Prop({ type: [mongoose.Schema.Types.Mixed] })
    pairs: PairModel[];

    @Prop({ type: [mongoose.Schema.Types.Mixed] })
    farms: FarmModelV2[];

    @Prop({ type: [mongoose.Schema.Types.Mixed] })
    stakingFarms: StakingModel[];

    @Prop({ type: [mongoose.Schema.Types.Mixed] })
    stakingProxies: StakingProxyModel[];

    @Prop({ type: mongoose.Schema.Types.Mixed })
    feesCollector: FeesCollectorModel;

    @Prop({ type: [mongoose.Schema.Types.Mixed] })
    tokens: EsdtToken[];
}

export type StateSnapshotDocument = StateSnapshot & mongoose.Document;

export const StateSnapshotSchema = SchemaFactory.createForClass(StateSnapshot);
