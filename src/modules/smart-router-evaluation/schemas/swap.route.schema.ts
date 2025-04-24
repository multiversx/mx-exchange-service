import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SwapRouteDocument = SwapRoute & Document;

@Schema()
export class SwapRoute {
    @Prop()
    sender: string;
    @Prop({ default: null })
    txHash?: string;
    @Prop({ index: true })
    txData: string;
    @Prop({ index: true })
    timestamp: number;
    @Prop({ index: true })
    tokenIn: string;
    @Prop({ index: true })
    tokenOut: string;
    @Prop()
    amountIn: string;
    @Prop()
    autoRouterAmountOut: string;
    @Prop()
    autoRouterTokenRoute: string[];
    @Prop()
    autoRouterIntermediaryAmounts: string[];
    @Prop()
    smartRouterAmountOut: string;
    @Prop()
    smartRouterTokenRoutes: string[][];
    @Prop()
    smartRouterIntermediaryAmounts: string[][];
    @Prop()
    outputDelta: string;
    @Prop({ index: true })
    outputDeltaPercentage: number;
}

export const SwapRouteSchema = SchemaFactory.createForClass(SwapRoute).index({
    tokenIn: 1,
    tokenOut: 1,
});
