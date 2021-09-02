import { GenericTokenAmountPairType } from 'src/models/genericTokenAmountPair.model';
import { GenericEventType } from '../generic.types';

export type PairProxyEventType = GenericEventType & {
    firstToken: GenericTokenAmountPairType;
    secondToken: GenericTokenAmountPairType;
    wrappedLpToken: GenericTokenAmountPairType;
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
