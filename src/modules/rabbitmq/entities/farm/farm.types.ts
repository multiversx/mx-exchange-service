import { FftTokenAmountPairType } from 'src/models/fftTokenAmountPair.model';
import { GenericTokenType } from 'src/models/genericToken.model
import { GenericEventType } from '../generic.types';

export type FarmEventType = GenericEventType & {
    farmingToken: FftTokenAmountPairType;
    farmingReserve: string;
    farmToken: GenericTokenType;
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
    rewardToken: GenericTokenType;
    rewardReserve: string;
};
