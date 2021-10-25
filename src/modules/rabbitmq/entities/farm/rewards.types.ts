import { GenericTokenType } from 'src/models/genericToken.model
import { GenericEventType } from '../generic.types';

export type RewardsEventType = GenericEventType & {
    oldFarmToken: GenericTokenType;
    newFarmToken: GenericTokenType;
    farmSupply: string;
    rewardToken: GenericTokenType;
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
