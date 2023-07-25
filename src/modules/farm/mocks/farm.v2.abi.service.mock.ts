import { FarmAbiServiceV2 } from '../v2/services/farm.v2.abi.service';
import { FarmAbiServiceMock } from './farm.abi.service.mock';
import { IFarmAbiServiceV2 } from '../v2/services/interfaces';
import { BoostedYieldsFactors } from '../models/farm.v2.model';

export class FarmAbiServiceMockV2
    extends FarmAbiServiceMock
    implements IFarmAbiServiceV2
{
    async lastUndistributedBoostedRewardsCollectWeek(): Promise<number> {
        return 1;
    }
    async undistributedBoostedRewards(): Promise<string> {
        return '5000';
    }
    async remainingBoostedRewardsToDistribute(): Promise<string> {
        return '1000';
    }

    accumulatedRewardsForWeek(): Promise<string> {
        throw new Error('Method not implemented.');
    }

    boostedYieldsFactors(): Promise<BoostedYieldsFactors> {
        throw new Error('Method not implemented.');
    }

    boostedYieldsRewardsPercenatage(): Promise<number> {
        throw new Error('Method not implemented.');
    }

    energyFactoryAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }

    lockEpochs(): Promise<number> {
        throw new Error('Method not implemented.');
    }

    lockingScAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }
}

export const FarmAbiServiceProviderV2 = {
    provide: FarmAbiServiceV2,
    useClass: FarmAbiServiceMockV2,
};
