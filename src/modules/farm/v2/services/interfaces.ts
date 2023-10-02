import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import {
    IFarmAbiService,
    IFarmComputeService,
} from '../../base-module/services/interfaces';
import { BoostedYieldsFactors } from '../../models/farm.v2.model';
import { EsdtTokenPayment } from '../../../../models/esdtTokenPayment.model';

export interface IFarmAbiServiceV2 extends IFarmAbiService {
    boostedYieldsRewardsPercenatage(farmAddress: string): Promise<number>;
    lockingScAddress(farmAddress: string): Promise<string>;
    lockEpochs(farmAddress: string): Promise<number>;
    remainingBoostedRewardsToDistribute(
        farmAddress: string,
        week: number,
    ): Promise<string>;
    lastUndistributedBoostedRewardsCollectWeek(
        farmAddress: string,
    ): Promise<number>;
    undistributedBoostedRewards(farmAddress: string): Promise<string>;
    boostedYieldsFactors(farmAddress: string): Promise<BoostedYieldsFactors>;
    accumulatedRewardsForWeek(scAddress: string, week: number): Promise<string>;
    energyFactoryAddress(farmAddress: string): Promise<string>;
    userTotalFarmPosition(
        farmAddress: string,
        userAddress: string,
    ): Promise<string>;
}

export interface IFarmComputeServiceV2 extends IFarmComputeService {
    farmBaseAPR(farmAddress: string): Promise<string>;
    userRewardsDistributionForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        liquidity: string,
    ): Promise<TokenDistributionModel[]>;
    userAccumulatedRewards(
        scAddress: string,
        userAddress: string,
        week: number,
        liquidity: string,
    ): Promise<string>;
    userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        liquidity: string,
    ): Promise<EsdtTokenPayment[]>;
    optimalEnergyPerLP(scAddress: string, week: number): Promise<string>;
}
