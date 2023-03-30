import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from './models/weekly-rewards-splitting.model';
import { EnergyModel } from '../../modules/energy/models/energy.model';
import { EnergyType } from '@multiversx/sdk-exchange';

export interface IWeeklyRewardsSplittingGetterService {
    currentClaimProgress(
        scAddress: string,
        userAddress: string,
    ): Promise<ClaimProgress>;
    userEnergyForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        endEpochForWeek: number,
    ): Promise<EnergyModel>;
    userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]>;
    lastActiveWeekForUser(
        scAddress: string,
        userAddress: string,
    ): Promise<number>;
    lastGlobalUpdateWeek(scAddress: string): Promise<number>;
    totalRewardsForWeek(
        scAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]>;
    totalEnergyForWeek(scAddress: string, week: number): Promise<string>;
    totalLockedTokensForWeek(scAddress: string, week: number): Promise<string>;
}

export interface IWeeklyRewardsSplittingSetterService {
    currentClaimProgress(
        scAddress: string,
        userAddress: string,
        value: ClaimProgress,
    ): Promise<string>;

    userEnergyForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        value: EnergyType,
    ): Promise<string>;

    userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        value: EsdtTokenPayment[],
    ): Promise<string>;

    lastActiveWeekForUser(
        scAddress: string,
        userAddress: string,
        value: number,
    ): Promise<string>;

    lastGlobalUpdateWeek(scAddress: string, value: number): Promise<string>;

    totalRewardsForWeek(
        scAddress: string,
        week: number,
        value: EsdtTokenPayment[],
    ): Promise<string>;

    totalEnergyForWeek(
        scAddress: string,
        week: number,
        value: string,
    ): Promise<string>;

    totalLockedTokensForWeek(
        scAddress: string,
        week: number,
        value: string,
    ): Promise<string>;
}

export interface IWeeklyRewardsSplittingComputeService {
    // computeUserAllRewards(
    //     scAddress: string,
    //     userAddress: string,
    //     currentWeek: number,
    // ): Promise<EsdtTokenPayment[]>;
    // advanceWeek(
    //     scAddress: string,
    //     userAddress: string,
    //     progress: ClaimProgress,
    //     endEpochForWeek: number,
    // ): Promise<ClaimProgress>;
    computeUserRewardsForWeek(
        scAddress: string,
        totalRewardsForWeek: EsdtTokenPayment[],
        userEnergyForWeek: EnergyType,
        totalEnergyForWeek: string,
        energyAmount?: string,
        liquidity?: string,
    ): Promise<EsdtTokenPayment[]>;
}

export interface IProgressComputeService {
    advanceWeek(
        progress: ClaimProgress,
        nextWeekEnergy: EnergyType,
        epochsInWeek: number,
    ): ClaimProgress;
}
