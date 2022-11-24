export interface ILockedTokenWrapperGetterService {
    getLockedTokenId(address: string): Promise<string>;
    getWrappedTokenId(address: string): Promise<string>;
}
