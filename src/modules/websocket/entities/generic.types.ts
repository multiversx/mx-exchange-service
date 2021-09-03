import BigNumber from 'bignumber.js';

export type GenericEventType = {
    address: string;
    caller: string;
    block: number;
    epoch: number;
    timestamp: number;
};

export type FftTokenAmountPairType = {
    tokenID: string;
    amount: BigNumber;
};

export type GenericTokenAmountPairType = {
    tokenID: string;
    tokenNonce: BigNumber;
    amount: BigNumber;
};
