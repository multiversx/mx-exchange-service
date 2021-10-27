import { GenericTokenType } from 'src/models/genericToken.model';
import { GenericEventType } from '../generic.types';

export type SwapEventType = GenericEventType & {
    tokenIn: GenericTokenType;
    tokenOut: GenericTokenType;
    feeAmount: string;
    tokenInReserves: string;
    tokenOutReserves: string;
};

export type AddLiquidityEventType = GenericEventType & {
    firstToken: GenericTokenType;
    secondToken: GenericTokenType;
    liquidityPoolToken: GenericTokenType;
    liquidityPoolSupply: string;
    firstTokenReserves: string;
    secondTokenReserves: string;
};

export type SwapNoFeeEventType = GenericEventType & {
    tokenIn: GenericTokenType;
    tokenOut: GenericTokenType;
    destination: string;
};
