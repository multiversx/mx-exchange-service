import { PriceDiscoveryGetterService } from '../services/price.discovery.getter.service';

class PriceDiscoveryGetterServiceMock {
    async getRedeemTokenID(priceDiscoveryAddress: string): Promise<string> {
        return 'RTOK-1234';
    }

    async getLaunchedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return '1';
    }

    async getAcceptedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return '100';
    }
}

export const PriceDiscoveryGetterServiceProvider = {
    provide: PriceDiscoveryGetterService,
    useClass: PriceDiscoveryGetterServiceMock,
};
