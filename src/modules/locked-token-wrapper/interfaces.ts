export interface ILockedTokenWrapperAbiService {
    wrappedTokenId(address: string): Promise<string>;
    energyFactoryAddress(address: string): Promise<string>;
}
