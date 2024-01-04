import {
    IProxyAbiService,
    IProxyFarmAbiService,
    IProxyPairAbiService,
} from '../services/interfaces';
import { ProxyPairAbiService } from '../services/proxy-pair/proxy.pair.abi.service';
import { ProxyAbiService } from '../services/proxy.abi.service';
import { ProxyFarmAbiService } from '../services/proxy-farm/proxy.farm.abi.service';

export class ProxyAbiServiceMock implements IProxyAbiService {
    async lockedAssetTokenID(proxyAddress: string): Promise<string[]> {
        return ['LKMEX-123456'];
    }
}

export class ProxyPairAbiServiceMock implements IProxyPairAbiService {
    async wrappedLpTokenID(proxyAddress: string): Promise<string> {
        return 'LKLP-abcdef';
    }
    intermediatedPairs(proxyAddress: string): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
}

export class ProxyFarmAbiServiceMock implements IProxyFarmAbiService {
    async wrappedFarmTokenID(proxyAddress: string): Promise<string> {
        return 'LKFARM-123456';
    }
    intermediatedFarms(proxyAddress: string): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
}

export const ProxyAbiServiceProvider = {
    provide: ProxyAbiService,
    useClass: ProxyAbiServiceMock,
};

export const ProxyPairAbiServiceProvider = {
    provide: ProxyPairAbiService,
    useClass: ProxyPairAbiServiceMock,
};

export const ProxyFarmAbiServiceProvider = {
    provide: ProxyFarmAbiService,
    useClass: ProxyFarmAbiServiceMock,
};
