import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { EnergyModel } from '../../../modules/simple-lock/models/simple.lock.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { IWeeklyRewardsSplittingGetterService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";


export class WeeklyRewardsSplittingGetterServiceMock implements IWeeklyRewardsSplittingGetterService {
    currentClaimProgressCalled: (scAddress: string, userAddress: string) => Promise<ClaimProgress>;
    userEnergyForWeekCalled: (scAddress: string, userAddress: string, week: number) => Promise<EnergyModel>;
    userRewardsForWeekCalled: (scAddress: string, userAddress: string, week: number) => Promise<EsdtTokenPayment[]>;
    lastActiveWeekForUserCalled: (scAddress: string, userAddress: string) => Promise<number>;
    lastGlobalUpdateWeekCalled: (scAddress: string) => Promise<number>;
    totalRewardsForWeekCalled: (scAddress: string, week: number) => Promise<EsdtTokenPayment[]>;
    totalEnergyForWeekCalled: (scAddress: string, week: number) => Promise<string>;
    totalLockedTokensForWeekCalled: (scAddress: string, week: number) => Promise<string>;

    currentClaimProgress(scAddress: string, userAddress: string): Promise<ClaimProgress> {
        if (this.currentClaimProgressCalled !== undefined) {
            return this.currentClaimProgressCalled(scAddress, userAddress);
        }
        throw ErrorNotImplemented
    }

    lastActiveWeekForUser(scAddress: string, userAddress: string): Promise<number> {
        if (this.lastActiveWeekForUserCalled !== undefined) {
            return this.lastActiveWeekForUserCalled(scAddress, userAddress);
        }
        throw ErrorNotImplemented
    }

    lastGlobalUpdateWeek(scAddress: string): Promise<number> {
        if (this.lastGlobalUpdateWeekCalled !== undefined) {
            return this.lastGlobalUpdateWeekCalled(scAddress);
        }
        throw ErrorNotImplemented
    }

    totalEnergyForWeek(scAddress: string, week: number): Promise<string> {
        if (this.totalEnergyForWeekCalled !== undefined) {
            return this.totalEnergyForWeekCalled(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    totalLockedTokensForWeek(scAddress: string, week: number): Promise<string> {
        if (this.totalLockedTokensForWeekCalled !== undefined) {
            return this.totalLockedTokensForWeekCalled(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    totalRewardsForWeek(scAddress: string, week: number): Promise<EsdtTokenPayment[]> {
        if (this.totalRewardsForWeekCalled !== undefined) {
            return this.totalRewardsForWeekCalled(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    userEnergyForWeek(scAddress: string, userAddress: string, week: number): Promise<EnergyModel> {
        if (this.userEnergyForWeekCalled !== undefined) {
            return this.userEnergyForWeekCalled(scAddress, userAddress, week);
        }
        throw ErrorNotImplemented
    }

    userRewardsForWeek(scAddress: string, userAddress: string, week: number): Promise<EsdtTokenPayment[]> {
        if (this.userRewardsForWeekCalled !== undefined) {
            return this.userRewardsForWeekCalled(scAddress, userAddress, week);
        }
        throw ErrorNotImplemented
    }
    constructor(init?: Partial<WeeklyRewardsSplittingGetterServiceMock>) {
        Object.assign(this, init);
    }
}
