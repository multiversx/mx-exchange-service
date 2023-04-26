export interface IProxyAbiService {
    lockedAssetTokenID(proxyAddress: string): Promise<string[]>;
}

export interface IProxyPairAbiService {
    wrappedLpTokenID(proxyAddress: string): Promise<string>;
    intermediatedPairs(proxyAddress: string): Promise<string[]>;
}

export interface IProxyFarmAbiService {
    wrappedFarmTokenID(proxyAddress: string): Promise<string>;

    intermediatedFarms(proxyAddress: string): Promise<string[]>;
}
