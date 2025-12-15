import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PairModel } from '../pair/models/pair.model';
import { EsdtToken } from '../tokens/models/esdtToken.model';

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
    tokens: EsdtToken[];
}

export type StateSnapshotDocument = StateSnapshot & mongoose.Document;

export const StateSnapshotSchema = SchemaFactory.createForClass(StateSnapshot);
