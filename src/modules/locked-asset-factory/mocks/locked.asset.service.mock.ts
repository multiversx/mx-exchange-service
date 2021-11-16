export class LockedAssetServiceMock {
    async getLockedTokenID(): Promise<string> {
        return 'LKMEX-1234';
    }
}
