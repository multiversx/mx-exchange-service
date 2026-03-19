import { Injectable } from '@nestjs/common';
import { XoxnoQuoteModel } from '../models/xoxno-aggregator.model';
import { XoxnoAggregatorService } from '../services/xoxno-aggregator.service';

@Injectable()
export class XoxnoAggregatorServiceMock {
    async getQuote(
        tokenIn: string,
        tokenOut: string,
        amountIn: string,
        slippage: number,
        sender?: string,
    ): Promise<XoxnoQuoteModel | undefined> {
        return undefined;
    }

    async getAmountOut(
        tokenIn: string,
        tokenOut: string,
        amountIn: string,
        slippage: number,
    ): Promise<string | undefined> {
        return undefined;
    }
}

export const XoxnoAggregatorServiceProvider = {
    provide: XoxnoAggregatorService,
    useClass: XoxnoAggregatorServiceMock,
};
