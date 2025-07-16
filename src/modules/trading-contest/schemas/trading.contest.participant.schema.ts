import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { TradingContest } from './trading.contest.schema';

export type TradingContestParticipantDocument = TradingContestParticipant &
    Document;

@Schema({ timestamps: true })
export class TradingContestParticipant {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TradingContest',
        index: true,
        required: true,
    })
    contest: mongoose.Schema.Types.ObjectId | TradingContest;
    @Prop({ index: true, required: true })
    address: string;
}

export const TradingContestParticipantSchema = SchemaFactory.createForClass(
    TradingContestParticipant,
).index({ contest: 1, address: 1 }, { unique: true });
