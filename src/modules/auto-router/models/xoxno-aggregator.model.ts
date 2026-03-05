import { TransactionModel } from 'src/models/transaction.model';

export interface XoxnoSwapModel {
    dex: string;
    pairId?: number;
    address: string;
    from: string;
    to: string;
    amountIn: string;
    amountOut: string;
}

export interface XoxnoPathModel {
    amountIn: string;
    amountOut: string;
    swaps: XoxnoSwapModel[];
}

export interface XoxnoQuoteModel {
    from: string;
    to: string;
    amountIn: string;
    amountOut: string;
    amountOutMin: string;
    slippage: number;
    priceImpact: number;
    rate: number;
    paths: XoxnoPathModel[];
    transaction?: TransactionModel;
}
