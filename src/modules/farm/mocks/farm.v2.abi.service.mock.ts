import { FarmAbiServiceV2 } from '../v2/services/farm.v2.abi.service';
import { FarmAbiServiceMock } from './farm.abi.service.mock';
import { IFarmAbiServiceV2 } from '../v2/services/interfaces';
import { BoostedYieldsFactors } from '../models/farm.v2.model';

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

    accumulatedRewardsForWeek(
        scAddress: string,
        week: number,
    ): Promise<string> {
        throw new Error('Method not implemented.');
    }

    boostedYieldsFactors(farmAddress: string): Promise<BoostedYieldsFactors> {
        throw new Error('Method not implemented.');
    }

    boostedYieldsRewardsPercenatage(farmAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }

    energyFactoryAddress(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }

    lockEpochs(farmAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
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
}

export const FarmAbiServiceProviderV2 = {
    provide: FarmAbiServiceV2,
    useClass: FarmAbiServiceMockV2,
};
