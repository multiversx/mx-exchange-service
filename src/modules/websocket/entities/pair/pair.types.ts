import { GenericEventType } from '../generic.types';

export type SwapEventType = GenericEventType & {
    tokenAmountIn: {
        tokenID: string;
        amount: string;
    };
    tokenAmountOut: {
        tokenID: string;
        amount: string;
    };
    feeAmount: string;
    pairReserves: {
        tokenID: string;
        amount: string;
    }[];
};

export type AddLiquidityEventType = GenericEventType & {
    firstTokenAmount: {
        tokenID: string;
        amount: string;
    };
    secondTokenAmount: {
        tokenID: string;
        amount: string;
    };
    liquidityPoolTokenAmount: {
        tokenID: string;
        amount: string;
    };
    liquidityPoolSupply: string;
    pairReserves: {
        tokenID: string;
        amount: string;
    }[];
};
