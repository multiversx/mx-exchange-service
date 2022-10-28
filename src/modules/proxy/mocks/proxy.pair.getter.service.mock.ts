export class ProxyPairGetterServiceMock {
    async getwrappedLpTokenID(proxyAddress: string): Promise<string> {
        return 'LKLP-abcd';
    }
}
