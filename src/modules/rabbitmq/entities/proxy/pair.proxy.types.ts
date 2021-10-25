import { GenericTokenType } from 'src/models/genericToken.model
import { GenericEventType } from '../generic.types';

export type PairProxyEventType = GenericEventType & {
    firstToken: GenericTokenType;
    secondToken: GenericTokenType;
    wrappedLpToken: GenericTokenType;
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
