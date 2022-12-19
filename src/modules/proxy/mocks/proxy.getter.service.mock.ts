export class ProxyGetterServiceMock {
    async getLockedAssetTokenID(proxyAddress: string): Promise<string> {
        return 'LKMEX-1234';
    }
}
