import { EsdtTokenPayment } from "../../../models/esdtTokenPayment.model";
import { ClaimProgress } from "../models/weekly-rewards-splitting.model";
import { IWeeklyRewardsSplittingComputeService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";


export class WeeklyRewardsSplittingComputeServiceMock implements IWeeklyRewardsSplittingComputeService {
    computeUserAllRewardsCalled: (scAddress: string, userAddress: string) => Promise<EsdtTokenPayment[]>;
    advanceWeekCalled:(scAddress: string, userAddress: string, progress: ClaimProgress) => Promise<ClaimProgress>;
    computeUserRewardsForWeekCalled:(scAddress: string, week: number, userAddress: string, energyAmount?: string) => Promise<EsdtTokenPayment[]>

    advanceWeek(scAddress: string, userAddress: string, progress: ClaimProgress): Promise<ClaimProgress> {
        if (this.advanceWeekCalled !== undefined) {
            return this.advanceWeekCalled(scAddress, userAddress, progress);
        }
        throw ErrorNotImplemented
    }

    computeUserAllRewards(scAddress: string, userAddress: string): Promise<EsdtTokenPayment[]> {
        if (this.computeUserAllRewardsCalled !== undefined) {
            return this.computeUserAllRewardsCalled(scAddress, userAddress);
        }
        throw ErrorNotImplemented
    }

    computeUserRewardsForWeek(scAddress: string, week: number, userAddress: string, energyAmount?: string): Promise<EsdtTokenPayment[]> {
        if (this.computeUserRewardsForWeekCalled !== undefined) {
            return this.computeUserRewardsForWeekCalled(scAddress, week, userAddress, energyAmount);
        }
        throw ErrorNotImplemented
    }
    constructor(init?: Partial<WeeklyRewardsSplittingComputeServiceMock>) {
        Object.assign(this, init);
    }
}
