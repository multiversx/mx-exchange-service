import { GenericEventType } from '../generic.types';

export type EnterFarmEventType = GenericEventType & {
    farmingToken: {
        tokenID: string;
        amount: string;
    };
    farmToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    farmSupply: string;
    rewardTokenReserve: {
        tokenID: string;
        amount: string;
    };
    farmAttributes: {
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
