import BigNumber from 'bignumber.js';
import { CalculateRewardsArgs } from './models/farm.args';

export class AbiFarmServiceMock {
    async getPenaltyPercent(farmAddress: string): Promise<number> {
        return 10;
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        return 3;
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        return new BigNumber(1000000000000000000);
    }
}
