import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type HypotheticalSwapDocument = HypotheticalSwap & Document;

@Schema()
export class HypotheticalSwap {
    @Prop({ index: true })
    tokenIn: string;
    @Prop({ index: true })
    tokenOut: string;
    @Prop()
    amountIn: string;
    @Prop({ index: true })
    amountInNum: number;
}

export const HypotheticalSwapSchema = SchemaFactory.createForClass(
    HypotheticalSwap,
).index(
    {
        tokenIn: 1,
        tokenOut: 1,
        amountInNum: 1,
    },
    { unique: true },
);

export type HypotheticalSwapResultDocument = HypotheticalSwapResult & Document;

@Schema()
export class HypotheticalSwapResult {
    @Prop({ index: true })
    timestamp: number;
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'HypotheticalSwap' })
    // swap: HypotheticalSwap;
    swap: mongoose.Schema.Types.ObjectId;
    @Prop()
    autoRouterAmountOut: string;
    @Prop({ index: true })
    autoRouterAmountOutNum: number;
    @Prop([String])
    autoRouterRoute: string[];
    @Prop()
    autoRouterIntermediaryAmounts: string[];
    @Prop()
    smartRouterAmountOut: string;
    @Prop({ index: true })
    smartRouterAmountOutNum: number;
    @Prop()
    smartRouterRoutes: string[][];
    @Prop()
    smartRouterIntermediaryAmounts: string[][];
}

export const HypotheticalSwapResultSchema = SchemaFactory.createForClass(
    HypotheticalSwapResult,
).index(
    {
        swap: 1,
        timestamp: 1,
    },
    { unique: true },
);
