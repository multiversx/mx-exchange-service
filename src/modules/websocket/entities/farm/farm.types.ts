import { GenericEventType } from '../generic.types';

export type FarmEventType = GenericEventType & {
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
};

export type EnterFarmEventType = FarmEventType & {
    rewardTokenReserve: {
        tokenID: string;
        amount: string;
    };
    createdWithMerge: boolean;
};

export type ExitFarmEventType = FarmEventType & {
    farmingReserve: string;
    rewardToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    rewardReserve: string;
};
