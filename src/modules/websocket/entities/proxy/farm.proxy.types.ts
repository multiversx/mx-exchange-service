import { GenericEventType } from '../generic.types';

export type FarmProxyEventType = GenericEventType & {
    farmAddress: string;
    farmingToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    wrappedFarmToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    wrappedFarmAttributes: {
        farmTokenID: string;
        farmTokenNonce: number;
        farmTokenAmount: string;
        farmingTokenID: string;
        farmingTokenNonce: number;
        farmingTokenAmount: string;
    };
};

export type EnterFarmProxyEventType = FarmProxyEventType & {
    createdWithMerge: boolean;
};

export type ExitFarmProxyEventType = FarmProxyEventType & {
    rewardToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
};

