import BigNumber from 'bignumber.js';
import { BoostedYieldsFactors } from 'src/modules/farm/models/farm.v2.model';

export interface IStakingAbiService {
    farmTokenID(stakeAddress: string): Promise<string>;
    farmingTokenID(stakeAddress: string): Promise<string>;
    rewardTokenID(stakeAddress: string): Promise<string>;
    farmTokenSupply(stakeAddress: string): Promise<string>;
    rewardPerShare(stakeAddress: string): Promise<string>;
    accumulatedRewards(stakeAddress: string): Promise<string>;
    rewardCapacity(stakeAddress: string): Promise<string>;
    annualPercentageRewards(stakeAddress: string): Promise<string>;

    minUnbondEpochs(stakeAddress: string): Promise<number>;
    perBlockRewardsAmount(stakeAddress: string): Promise<string>;
    lastRewardBlockNonce(stakeAddress: string): Promise<number>;
    divisionSafetyConstant(stakeAddress: string): Promise<number>;
    produceRewardsEnabled(stakeAddress: string): Promise<boolean>;
    state(stakeAddress: string): Promise<string>;
    calculateRewardsForGivenPosition(
        stakeAddress: string,
        amount: string,
        attributes: string,
    ): Promise<BigNumber>;
    lockedAssetFactoryAddress(stakeAddress: string): Promise<string>;
    isWhitelisted(stakeAddress: string, scAddress: string): Promise<boolean>;
    lastErrorMessage(stakeAddress: string): Promise<string>;
    energyFactoryAddress(stakeAddress: string): Promise<string>;
    boostedYieldsRewardsPercenatage(stakeAddress: string): Promise<number>;
    boostedYieldsFactors(stakeAddress: string): Promise<BoostedYieldsFactors>;
    accumulatedRewardsForWeek(
        stakeAddress: string,
        week: number,
    ): Promise<string>;
    undistributedBoostedRewards(stakeAddress: string): Promise<string>;
    lastUndistributedBoostedRewardsCollectWeek(
        stakeAddress: string,
    ): Promise<number>;
    remainingBoostedRewardsToDistribute(
        stakeAddress: string,
        week: number,
    ): Promise<string>;
    userTotalStakePosition(
        stakeAddress: string,
        userAddress: string,
    ): Promise<string>;
    farmPositionMigrationNonce(stakeAddress: string): Promise<number>;
    stakingShard(stakeAddress: string): Promise<number>;
}
