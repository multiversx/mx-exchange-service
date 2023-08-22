import { PriceDiscoveryService } from '../services/price.discovery.service';

class PriceDiscoveryServiceMock {
    async getPriceDiscoveryAddresByRedeemToken(): Promise<string | undefined> {
        return 'price_discovery_sc';
    }
}

export const PriceDiscoveryServiceProvider = {
    provide: PriceDiscoveryService,
    useClass: PriceDiscoveryServiceMock,
};
