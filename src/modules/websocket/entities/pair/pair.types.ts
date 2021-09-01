import { FftTokenAmountPairType } from 'src/models/fftTokenAmountPair.model';
import { GenericEventType } from '../generic.types';

export type SwapEventType = GenericEventType & {
    tokenAmountIn: FftTokenAmountPairType;
    tokenAmountOut: FftTokenAmountPairType;
    feeAmount: string;
    pairReserves: FftTokenAmountPairType[];
};

export type AddLiquidityEventType = GenericEventType & {
    firstTokenAmount: FftTokenAmountPairType;
    secondTokenAmount: FftTokenAmountPairType;
    liquidityPoolTokenAmount: FftTokenAmountPairType;
    liquidityPoolSupply: string;
    pairReserves: FftTokenAmountPairType[];
};

export type SwapNoFeeEventType = GenericEventType & {
    tokenAmountOut: FftTokenAmountPairType;
    destination: string;
};
