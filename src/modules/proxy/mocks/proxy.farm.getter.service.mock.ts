export class ProxyFarmGetterServiceMock {
    async getwrappedFarmTokenID(proxyAddress: string): Promise<string> {
        return 'LKFARM-1234';
    }
}
