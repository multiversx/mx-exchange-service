import { GenericTokenAmountPairType } from 'src/models/genericTokenAmountPair.model';
import { GenericEventType } from '../generic.types';

export type FarmProxyEventType = GenericEventType & {
    farmAddress: string;
    farmingToken: GenericTokenAmountPairType;
    wrappedFarmToken: GenericTokenAmountPairType;
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
    rewardToken: GenericTokenAmountPairType;
};

export type RewardsProxyEventType = GenericEventType & {
    farmAddress: string;
    oldWrappedFarmToken: GenericTokenAmountPairType;
    newWrappedFarmToken: GenericTokenAmountPairType;
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
    rewardToken: GenericTokenAmountPairType;
};
