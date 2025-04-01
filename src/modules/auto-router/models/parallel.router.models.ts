export type ParallelRouteAllocation = {
    tokenRoute: string[]; // tokens on this route, e.g. [A, X, B]
    addressRoute: string[]; // the corresponding PairModel addresses
    inputAmount: string; // how much A allocated to this route
    outputAmount: string; // how much B we get from this route
    intermediaryAmounts: string[];
};

export type ParallelRouteSwap = {
    allocations: ParallelRouteAllocation[];
    totalResult: string;
};
