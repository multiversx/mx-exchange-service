import {
    IFarmAbiService,
    IFarmComputeService,
} from '../../base-module/services/interfaces';
import { BoostedYieldsFactors } from '../../models/farm.v2.model';

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
    farmPositionMigrationNonce(farmAddress: string): Promise<number>;
    farmSupplyForWeek(farmAddress: string, week: number): Promise<string>;
}

export interface IFarmComputeServiceV2 extends IFarmComputeService {
    farmBaseAPR(farmAddress: string): Promise<string>;
    userAccumulatedRewards(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<string>;
    optimalEnergyPerLP(scAddress: string, week: number): Promise<string>;
}
