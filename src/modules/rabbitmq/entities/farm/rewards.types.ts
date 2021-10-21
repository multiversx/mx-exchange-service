import { GenericTokenAmountPairType } from 'src/models/genericTokenAmountPair.model';
import { GenericEventType } from '../generic.types';

export type RewardsEventType = GenericEventType & {
    oldFarmToken: GenericTokenAmountPairType;
    newFarmToken: GenericTokenAmountPairType;
    farmSupply: string;
    rewardToken: GenericTokenAmountPairType;
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
