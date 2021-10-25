import { GenericTokenType } from 'src/models/genericToken.model';
import { GenericEventType } from '../generic.types';

export type FarmEventType = GenericEventType & {
    farmingToken: GenericTokenType;
    farmingReserve: string;
    farmToken: GenericTokenType;
    farmSupply: string;
    rewardToken: GenericTokenType;
    rewardTokenReserves: string;
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
    createdWithMerge: boolean;
};
