import BigNumber from 'bignumber.js';
import { CalculateRewardsArgs } from '../../models/farm.args';

export interface IFarmAbiService {
    farmedTokenID(farmAddress: string): Promise<string>;
    farmTokenID(farmAddress: string): Promise<string>;
    farmingTokenID(farmAddress: string): Promise<string>;
    farmTokenSupply(farmAddress: string): Promise<string>;
    rewardsPerBlock(farmAddress: string): Promise<string>;
    penaltyPercent(farmAddress: string): Promise<number>;
    minimumFarmingEpochs(farmAddress: string): Promise<number>;
    rewardPerShare(farmAddress: string): Promise<string>;
    rewardReserve(farmAddress: string): Promise<string>;
    lastRewardBlockNonce(farmAddress: string): Promise<number>;
    divisionSafetyConstant(farmAddress: string): Promise<string>;
    calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber>;
    state(farmAddress: string): Promise<string>;
    produceRewardsEnabled(farmAddress: string): Promise<boolean>;
    burnGasLimit(farmAddress: string): Promise<string>;
    transferExecGasLimit(farmAddress: string): Promise<string>;
    pairContractAddress(farmAddress: string): Promise<string>;
    lastErrorMessage(farmAddress: string): Promise<string>;
    ownerAddress(farmAddress: string): Promise<string>;
    farmShard(farmAddress: string): Promise<number>;
}

export interface IFarmComputeService {
    farmLockedValueUSD(farmAddress: string): Promise<string>;
    farmedTokenPriceUSD(farmAddress: string): Promise<string>;
    farmingTokenPriceUSD(farmAddress: string): Promise<string>;
    computeMintedRewards(farmAddress: string): Promise<BigNumber>;
}
