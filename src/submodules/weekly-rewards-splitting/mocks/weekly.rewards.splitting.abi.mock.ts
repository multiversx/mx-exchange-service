import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { EnergyModel } from 'src/modules/energy/models/energy.model';
import { IWeeklyRewardsSplittingAbiService } from '../interfaces';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingAbiService } from '../services/weekly-rewards-splitting.abi.service';

export class WeeklyRewardsSplittingAbiServiceMock
    implements IWeeklyRewardsSplittingAbiService
{
    currentClaimProgress(): Promise<ClaimProgress> {
        throw new Error('Method not implemented.');
    }
    userEnergyForWeek(): Promise<EnergyModel> {
        throw new Error('Method not implemented.');
    }

    async lastActiveWeekForUser(): Promise<number> {
        return 0;
    }

    lastGlobalUpdateWeek(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    async totalRewardsForWeek(): Promise<EsdtTokenPayment[]> {
        return [
            new EsdtTokenPayment({
                amount: '100000000000000000000',
                tokenID: 'WEGLD-123456',
            }),
            new EsdtTokenPayment({
                amount: '150000000000000000000',
                tokenID: 'MEX-123456',
            }),
            new EsdtTokenPayment({
                amount: '200000000000000000000',
                tokenID: 'TOK4-123456',
            }),
        ];
    }
    async totalEnergyForWeek(): Promise<string> {
        return '1000';
    }
    async totalLockedTokensForWeek(): Promise<string> {
        return '1000';
    }
}

export const WeeklyRewardsSplittingAbiServiceProvider = {
    provide: WeeklyRewardsSplittingAbiService,
    useClass: WeeklyRewardsSplittingAbiServiceMock,
};
