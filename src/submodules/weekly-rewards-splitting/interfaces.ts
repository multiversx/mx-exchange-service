import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from './models/weekly-rewards-splitting.model';
import { EnergyModel } from '../../modules/energy/models/energy.model';
import { EnergyType } from '@elrondnetwork/erdjs-dex';

export interface IWeeklyRewardsSplittingGetterService {
    currentClaimProgress(
        scAddress: string,
        userAddress: string,
    ): Promise<ClaimProgress>;
    userEnergyForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
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

export interface IWeeklyRewardsSplittingComputeService {
    computeUserAllRewards(
        scAddress: string,
        userAddress: string,
    ): Promise<EsdtTokenPayment[]>;
    advanceWeek(
        scAddress: string,
        userAddress: string,
        progress: ClaimProgress,
    ): Promise<ClaimProgress>;
    computeUserRewardsForWeek(
        scAddress: string,
        week: number,
        userAddress: string,
        energyAmount?: string,
        positionAmount?: string,
    ): Promise<EsdtTokenPayment[]>;
}

export interface IWeeklyRewardsSplittingService {
    getGlobalInfoByWeek(scAddress: string, week: number): GlobalInfoByWeekModel;
    getUserInfoByWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): UserInfoByWeekModel;
}

export interface IProgressComputeService {
    advanceWeek(
        progress: ClaimProgress,
        nextWeekEnergy: EnergyType,
        epochsInWeek: number,
    ): ClaimProgress;
}
