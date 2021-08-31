import { GenericEventType } from '../generic.types';

export type PairProxyEventType = GenericEventType & {
    firstToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    secondToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    wrappedLpToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    wrappedLpAttributes: {
        lpTokenID: string;
        lpTokenTotalAmount: string;
        lockedAssetsInvested: string;
        lockedAssetsNonce: number;
    };
};

export type AddLiquidityProxyEventType = PairProxyEventType & {
    createdWithMerge: boolean;
};
