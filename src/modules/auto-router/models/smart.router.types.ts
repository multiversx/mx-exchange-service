import BigNumber from 'bignumber.js';

export type ParallelRouteAllocation = {
    tokenRoute: string[];
    addressRoute: string[];
    inputAmount: string;
    outputAmount: string;
    intermediaryAmounts: string[];
};

export type ParallelRouteSwap = {
    allocations: ParallelRouteAllocation[];
    totalResult: string;
};

export type RouteCandidate = {
    path: string[];
    poolsUsed: string[]; // addresses of PairModel
    singleRouteOutput: BigNumber; // final tokenOut if 100% of user input goes here
};

export type Pool = {
    inputReserve: BigNumber; // The relevant reserve for the input token in this hop
    outputReserve: BigNumber; // The relevant reserve for the output token in this hop
    fee: BigNumber; // E.g., 0.003 for a 0.3% swap fee
};

export type RouteParameters = {
    alpha: BigNumber;
    beta: BigNumber;
    epsilon: BigNumber;
};
