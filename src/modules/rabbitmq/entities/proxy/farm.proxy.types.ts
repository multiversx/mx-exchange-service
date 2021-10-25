import { GenericTokenType } from 'src/models/genericToken.model';
import { GenericEventType } from '../generic.types';

export type FarmProxyEventType = GenericEventType & {
    farmAddress: string;
    farmingToken: GenericTokenType;
    wrappedFarmToken: GenericTokenType;
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
    rewardToken: GenericTokenType;
};

export type RewardsProxyEventType = GenericEventType & {
    farmAddress: string;
    oldWrappedFarmToken: GenericTokenType;
    newWrappedFarmToken: GenericTokenType;
    oldWrappedFarmAttributes: {
        farmTokenID: string;
        farmTokenNonce: number;
        farmTokenAmount: string;
        farmingTokenID: string;
        farmingTokenNonce: number;
        farmingTokenAmount: string;
    };
    newWrappedFarmAttributes: {
        farmTokenID: string;
        farmTokenNonce: number;
        farmTokenAmount: string;
        farmingTokenID: string;
        farmingTokenNonce: number;
        farmingTokenAmount: string;
    };
    createdWithMerge: boolean;
};

export type ClaimRewardsProxyEventType = RewardsProxyEventType & {
    rewardToken: GenericTokenType;
};
