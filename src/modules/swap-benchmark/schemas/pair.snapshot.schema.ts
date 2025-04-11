import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PairModel } from 'src/modules/pair/models/pair.model';

export type PairSnapshotDocument = PairSnapshotDbModel & Document;

@Schema()
export class PairSnapshotDbModel {
    @Prop()
    timestamp: number;
    @Prop()
    blockNonce: number;
    @Prop()
    pairs: PairModel[];
    @Prop()
    reservesInitialised: boolean;
}

export const PairSnapshotSchema = SchemaFactory.createForClass(
    PairSnapshotDbModel,
).index(
    {
        timestamp: 1,
    },
    { unique: true },
);
