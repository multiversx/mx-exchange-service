import { IPriceDiscoveryComputeService } from '../services/interfaces';
import { PriceDiscoveryComputeService } from '../services/price.discovery.compute.service';

export class PriceDiscoveryComputeServiceMock
    implements IPriceDiscoveryComputeService
{
    launchedTokenPrice(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    acceptedTokenPrice(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async launchedTokenPriceUSD(): Promise<string> {
        return '1';
    }
    async acceptedTokenPriceUSD(): Promise<string> {
        return '100';
    }
}

export const PriceDiscoveryComputeServiceProvider = {
    provide: PriceDiscoveryComputeService,
    useClass: PriceDiscoveryComputeServiceMock,
};
