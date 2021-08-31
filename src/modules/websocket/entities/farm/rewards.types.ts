import { GenericEventType } from '../generic.types';

export type RewardsEventType = GenericEventType & {
    oldFarmToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    newFarmToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    farmSupply: string;
    rewardToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    rewardTokenReserve: string;
    oldFarmAttributes: {
        rewardPerShare: string;
        originalEnteringEpoch: number;
        enteringEpoch: number;
        aprMultiplier: number;
        lockedRewards: boolean;
        initialFarmingAmount: string;
        compoundedReward: string;
        currentFarmAmount: string;
    };
    newFarmAttributes: {
        rewardPerShare: string;
        originalEnteringEpoch: number;
        enteringEpoch: number;
        aprMultiplier: number;
        lockedRewards: boolean;
        initialFarmingAmount: string;
        compoundedReward: string;
        currentFarmAmount: string;
    };
    createdWithMerge: boolean;
};
