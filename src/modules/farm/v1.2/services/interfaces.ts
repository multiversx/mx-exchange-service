import {
    IFarmAbiService,
    IFarmComputeService,
} from '../../base-module/services/interfaces';
import { FarmMigrationConfig } from '../../models/farm.model';

export interface IFarmAbiServiceV1_2 extends IFarmAbiService {
    lockedAssetFactoryAddress(farmAddress: string): Promise<string>;
    farmingTokenReserve(farmAddress: string): Promise<string>;
    undistributedFees(farmAddress: string): Promise<string>;
    currentBlockFee(farmAddress: string): Promise<string>;
    lockedRewardAprMuliplier(farmAddress: string): Promise<number>;
    farmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig | undefined>;
}

export interface IFarmComputeServiceV1_2 extends IFarmComputeService {
    lockedFarmingTokenReserve(farmAddress: string): Promise<string>;
    unlockedFarmingTokenReserve(farmAddress: string): Promise<string>;
    lockedFarmingTokenReserveUSD(farmAddress: string): Promise<string>;
    unlockedFarmingTokenReserveUSD(farmAddress: string): Promise<string>;
    unlockedRewardsAPR(farmAddress: string): Promise<string>;
    lockedRewardsAPR(farmAddress: string): Promise<string>;
}
