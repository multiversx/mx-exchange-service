import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { TradingContestDocument } from './trading.contest.schema';
import { TradingContestParticipantDocument } from './trading.contest.participant.schema';

export type TradingContestSwapDocument = TradingContestSwap & Document;

@Schema()
export class TradingContestSwap {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TradingContest',
        index: true,
        required: true,
    })
    contest: mongoose.Schema.Types.ObjectId | TradingContestDocument;
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TradingContestParticipant',
        index: true,
        default: null,
    })
    participant?:
        | mongoose.Schema.Types.ObjectId
        | TradingContestParticipantDocument;
    @Prop({ index: true })
    txHash: string;
    @Prop({ index: true })
    pairAddress: string;
    @Prop()
    swapType: number;
    @Prop({ index: true })
    volumeUSD: number;
    @Prop({ index: true })
    feesUSD: number;
    @Prop({ index: true })
    tokenIn: string;
    @Prop({ index: true })
    tokenOut: string;
    @Prop()
    amountIn: string;
    @Prop()
    amountOut: string;
    @Prop({ index: true })
    timestamp: number;
}

export const TradingContestSwapSchema = SchemaFactory.createForClass(
    TradingContestSwap,
)
    .index({ contest: 1, txHash: 1 }, { unique: true })
    .index({ contest: 1, participant: 1 });
