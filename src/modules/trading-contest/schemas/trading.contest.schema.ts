import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

export type TradingContestDocument = TradingContest & Document;

@Schema({
    timestamps: true,
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
})
export class TradingContest {
    @Prop({ unique: true })
    name: string;
    @Prop({
        type: mongoose.Schema.Types.UUID,
        unique: true,
    })
    uuid: string;
    @Prop([String])
    tokens: string[];
    @Prop([String])
    pairAddresses: string[];
    @Prop()
    requiresRegistration: boolean;
    @Prop({
        type: [String],
        required: false,
        default: [],
    })
    tokensPair: string[];
    @Prop()
    start: number;
    @Prop()
    end: number;
    @Prop()
    minSwapAmountUSD: number;
}

export const TradingContestSchema =
    SchemaFactory.createForClass(TradingContest);
