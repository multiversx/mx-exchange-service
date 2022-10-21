import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { EnergyModel } from '../../../modules/simple-lock/models/simple.lock.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { IWeeklyRewardsSplittingGetterService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";


export class WeeklyRewardsSplittingGetterHandlers implements IWeeklyRewardsSplittingGetterService {
    currentClaimProgress: (scAddress: string, userAddress: string) => Promise<ClaimProgress>;
    userEnergyForWeek: (scAddress: string, userAddress: string, week: number) => Promise<EnergyModel>;
    userRewardsForWeek: (scAddress: string, userAddress: string, week: number) => Promise<EsdtTokenPayment[]>;
    lastActiveWeekForUser: (scAddress: string, userAddress: string) => Promise<number>;
    lastGlobalUpdateWeek: (scAddress: string) => Promise<number>;
    totalRewardsForWeek: (scAddress: string, week: number) => Promise<EsdtTokenPayment[]>;
    totalEnergyForWeek: (scAddress: string, week: number) => Promise<string>;
    totalLockedTokensForWeek: (scAddress: string, week: number) => Promise<string>;
    constructor(init: Partial<WeeklyRewardsSplittingGetterHandlers>) {
        Object.assign(this, init);
    }
}

export class WeeklyRewardsSplittingGetterServiceMock implements IWeeklyRewardsSplittingGetterService {
    handlers: WeeklyRewardsSplittingGetterHandlers;
    currentClaimProgress(scAddress: string, userAddress: string): Promise<ClaimProgress> {
        if (this.handlers.currentClaimProgress !== undefined) {
            return this.handlers.currentClaimProgress(scAddress, userAddress);
        }
        throw ErrorNotImplemented
    }

    lastActiveWeekForUser(scAddress: string, userAddress: string): Promise<number> {
        if (this.handlers.lastActiveWeekForUser !== undefined) {
            return this.handlers.lastActiveWeekForUser(scAddress, userAddress);
        }
        throw ErrorNotImplemented
    }

    lastGlobalUpdateWeek(scAddress: string): Promise<number> {
        if (this.handlers.lastGlobalUpdateWeek !== undefined) {
            return this.handlers.lastGlobalUpdateWeek(scAddress);
        }
        throw ErrorNotImplemented
    }

    totalEnergyForWeek(scAddress: string, week: number): Promise<string> {
        if (this.handlers.totalEnergyForWeek !== undefined) {
            return this.handlers.totalEnergyForWeek(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    totalLockedTokensForWeek(scAddress: string, week: number): Promise<string> {
        if (this.handlers.totalLockedTokensForWeek !== undefined) {
            return this.handlers.totalLockedTokensForWeek(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    totalRewardsForWeek(scAddress: string, week: number): Promise<EsdtTokenPayment[]> {
        if (this.handlers.totalRewardsForWeek !== undefined) {
            return this.handlers.totalRewardsForWeek(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    userEnergyForWeek(scAddress: string, userAddress: string, week: number): Promise<EnergyModel> {
        if (this.handlers.userEnergyForWeek !== undefined) {
            return this.handlers.userEnergyForWeek(scAddress, userAddress, week);
        }
        throw ErrorNotImplemented
    }

    userRewardsForWeek(scAddress: string, userAddress: string, week: number): Promise<EsdtTokenPayment[]> {
        if (this.handlers.userRewardsForWeek !== undefined) {
            return this.handlers.userRewardsForWeek(scAddress, userAddress, week);
        }
        throw ErrorNotImplemented
    }

    constructor(init: Partial<WeeklyRewardsSplittingGetterHandlers>) {
        this.handlers = new WeeklyRewardsSplittingGetterHandlers(init);
    }
}
