import BigNumber from 'bignumber.js';

export type GenericEventType = {
    caller: string;
    block: number;
    epoch: number;
    timestamp: number;
};

export type FftTokenAmountPairType = {
    tokenID: string;
    amount: BigNumber;
};
