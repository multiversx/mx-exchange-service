import BigNumber from 'bignumber.js';
import { IStakingAbiService } from '../services/interfaces';
import { StakingAbiService } from '../services/staking.abi.service';
import { BoostedYieldsFactors } from 'src/modules/farm/models/farm.v2.model';

export class StakingAbiServiceMock implements IStakingAbiService {
    async farmTokenID(stakeAddress: string): Promise<string> {
        return 'STAKETOK-111111';
    }
    async farmingTokenID(stakeAddress: string): Promise<string> {
        return 'WEGLD-123456';
    }
    async rewardTokenID(stakeAddress: string): Promise<string> {
        return 'WEGLD-123456';
    }
    async farmTokenSupply(stakeAddress: string): Promise<string> {
        return '5256000000000000000';
    }
    async rewardPerShare(stakeAddress: string): Promise<string> {
        return '150000000000000000000';
    }
    async accumulatedRewards(stakeAddress: string): Promise<string> {
        return '10000000000000000000';
    }
    async rewardCapacity(stakeAddress: string): Promise<string> {
        return '10000000000000000000000';
    }
    async annualPercentageRewards(stakeAddress: string): Promise<string> {
        return new BigNumber(1000).toFixed();
    }
    minUnbondEpochs(stakeAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    async perBlockRewardsAmount(stakeAddress: string): Promise<string> {
        return new BigNumber(500000000).toFixed();
    }
    async lastRewardBlockNonce(stakeAddress: string): Promise<number> {
        return new BigNumber(100).toNumber();
    }
    async divisionSafetyConstant(stakeAddress: string): Promise<number> {
        return new BigNumber(1000000000000).toNumber();
    }
    async produceRewardsEnabled(stakeAddress: string): Promise<boolean> {
        return true;
    }
    state(stakeAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    calculateRewardsForGivenPosition(
        stakeAddress: string,
        amount: string,
        attributes: string,
    ): Promise<BigNumber> {
        throw new Error('Method not implemented.');
    }
    lockedAssetFactoryAddress(stakeAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    isWhitelisted(stakeAddress: string, scAddress: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    lastErrorMessage(stakeAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    energyFactoryAddress(stakeAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    boostedYieldsRewardsPercenatage(stakeAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    boostedYieldsFactors(stakeAddress: string): Promise<BoostedYieldsFactors> {
        throw new Error('Method not implemented.');
    }
    accumulatedRewardsForWeek(
        stakeAddress: string,
        week: number,
    ): Promise<string> {
        throw new Error('Method not implemented.');
    }
    undistributedBoostedRewards(stakeAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    lastUndistributedBoostedRewardsCollectWeek(
        stakeAddress: string,
    ): Promise<number> {
        throw new Error('Method not implemented.');
    }
    remainingBoostedRewardsToDistribute(
        stakeAddress: string,
        week: number,
    ): Promise<string> {
        throw new Error('Method not implemented.');
    }
    userTotalStakePosition(
        stakeAddress: string,
        userAddress: string,
    ): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async farmPositionMigrationNonce(stakeAddress: string): Promise<number> {
        return 2;
    }
    async stakingShard(stakeAddress: string): Promise<number> {
        return 1;
    }
}

export const StakingAbiServiceProvider = {
    provide: StakingAbiService,
    useClass: StakingAbiServiceMock,
};
