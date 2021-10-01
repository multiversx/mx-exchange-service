import { FftTokenAmountPairType } from 'src/models/fftTokenAmountPair.model';
import { GenericTokenAmountPairType } from 'src/models/genericTokenAmountPair.model';
import { GenericEventType } from '../generic.types';

export type FarmEventType = GenericEventType & {
    farmingToken: FftTokenAmountPairType;
    farmingReserve: string;
    farmToken: GenericTokenAmountPairType;
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
    rewardTokenReserve: FftTokenAmountPairType;
    createdWithMerge: boolean;
};

export type ExitFarmEventType = FarmEventType & {
    rewardToken: GenericTokenAmountPairType;
    rewardReserve: string;
};
