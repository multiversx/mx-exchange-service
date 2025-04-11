import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HistoricalSwapDocument = HistoricalSwapDbModel & Document;

@Schema()
export class HistoricalSwapDbModel {
    @Prop()
    timestamp: number;
    @Prop()
    prevBlockTimestamp: number;
    @Prop()
    prevBlockNonce: number;
    @Prop()
    originalTx: string;
    @Prop()
    tokenIn: string;
    @Prop()
    tokenOut: string;
    @Prop()
    amountIn: string;
    @Prop()
    expectedAmountOut: string;
    @Prop()
    txRoute: string[];
    @Prop()
    txIntermediaryAmounts: string[];
    @Prop()
    actualAmountOut: string;
    @Prop()
    autoRouterAmountOut: string;
    @Prop()
    smartRouterAmountOut: string;
    @Prop()
    autoRouterRoute: string[];
    @Prop()
    autoRouterIntermediaryAmounts: string[];
    @Prop()
    smartRouterRoutes: string[][];
    @Prop()
    smartRouterIntermediaryAmounts: string[][];
}

export const HistoricalSwapSchema = SchemaFactory.createForClass(
    HistoricalSwapDbModel,
).index(
    {
        timestamp: 1,
    },
    { unique: true },
);
