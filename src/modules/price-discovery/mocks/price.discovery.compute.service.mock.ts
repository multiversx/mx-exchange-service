import { IPriceDiscoveryComputeService } from '../services/interfaces';
import { PriceDiscoveryComputeService } from '../services/price.discovery.compute.service';

export class PriceDiscoveryComputeServiceMock
    implements IPriceDiscoveryComputeService
{
    launchedTokenPrice(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    acceptedTokenPrice(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async launchedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return '1';
    }
    async acceptedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return '100';
    }
}

export const PriceDiscoveryComputeServiceProvider = {
    provide: PriceDiscoveryComputeService,
    useClass: PriceDiscoveryComputeServiceMock,
};
