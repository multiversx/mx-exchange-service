import { FarmAbiServiceV2 } from '../v2/services/farm.v2.abi.service';
import { FarmAbiServiceMock } from './farm.abi.service.mock';
import { IFarmAbiServiceV2 } from '../v2/services/interfaces';
import { BoostedYieldsFactors } from '../models/farm.v2.model';
import BigNumber from 'bignumber.js';

export class FarmAbiServiceMockV2
    extends FarmAbiServiceMock
    implements IFarmAbiServiceV2
{
    async lastUndistributedBoostedRewardsCollectWeek(
        farmAddress: string,
    ): Promise<number> {
        return 1;
    }
    async undistributedBoostedRewards(farmAddress: string): Promise<string> {
        return '5000';
    }
    async remainingBoostedRewardsToDistribute(
        farmAddress: string,
        week: number,
    ): Promise<string> {
        return '1000';
    }

    async accumulatedRewardsForWeek(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return new BigNumber('1000000000000000000')
            .multipliedBy(10 * 60 * 24 * 7)
            .multipliedBy(0.6)
            .toFixed();
    }

    async boostedYieldsFactors(
        farmAddress: string,
    ): Promise<BoostedYieldsFactors> {
        return {
            maxRewardsFactor: '2',
            minFarmAmount: '1',
            minEnergyAmount: '1',
            userRewardsFarm: '0',
            userRewardsEnergy: '1',
        };
    }

    async boostedYieldsRewardsPercenatage(
        farmAddress: string,
    ): Promise<number> {
        return 6000;
    }

    energyFactoryAddress(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }

    async lockEpochs(farmAddress: string): Promise<number> {
        return 1440;
    }

    lockingScAddress(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }

    userTotalFarmPosition(
        farmAddress: string,
        userAddress: string,
    ): Promise<string> {
        throw new Error('Method not implemented.');
    }

    async farmPositionMigrationNonce(farmAddress: string): Promise<number> {
        return 10;
    }

    async farmSupplyForWeek(
        farmAddress: string,
        week: number,
    ): Promise<string> {
        return '2';
    }
}

export const FarmAbiServiceProviderV2 = {
    provide: FarmAbiServiceV2,
    useClass: FarmAbiServiceMockV2,
};
