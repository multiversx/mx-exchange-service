export class LockedAssetServiceMock {
    async getLockedTokenID(): Promise<string> {
        return 'LKTOK-1234';
    }
}
