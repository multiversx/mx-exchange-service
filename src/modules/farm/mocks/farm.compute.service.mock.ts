import { FarmComputeService } from '../base-module/services/farm.compute.service';
import { IFarmComputeService } from '../base-module/services/interfaces';

export class FarmComputeServiceMock implements IFarmComputeService {
    farmLockedValueUSD(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async farmedTokenPriceUSD(): Promise<string> {
        return '100';
    }
    async farmTokenPriceUSD(): Promise<string> {
        return '200';
    }
    async farmingTokenPriceUSD(): Promise<string> {
        return '200';
    }
}

export const FarmComputeServiceProvider = {
    provide: FarmComputeService,
    useClass: FarmComputeServiceMock,
};
