import BigNumber from 'bignumber.js';
import { FarmComputeService } from '../base-module/services/farm.compute.service';
import { IFarmComputeService } from '../base-module/services/interfaces';

export class FarmComputeServiceMock implements IFarmComputeService {
    farmLockedValueUSD(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async farmedTokenPriceUSD(farmAddress: string): Promise<string> {
        return '100';
    }
    async farmingTokenPriceUSD(farmAddress: string): Promise<string> {
        return '200';
    }
    computeMintedRewards(farmAddress: string): Promise<BigNumber> {
        throw new Error('Method not implemented.');
    }
}

export const FarmComputeServiceProvider = {
    provide: FarmComputeService,
    useClass: FarmComputeServiceMock,
};
