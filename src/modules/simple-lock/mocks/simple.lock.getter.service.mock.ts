class SimpleLockGetterServiceMock {
    async getLockedTokenID(): Promise<string> {
        return 'LKESDT-1234';
    }

    async getLpProxyTokenID(): Promise<string> {
        return 'LKPL-abcd';
    }

    async getFarmProxyTokenID(): Promise<string> {
        return 'LKFARM-abcd';
    }
}

export const SimpleLockGetterServiceProvider = {
    provide: 'SimpleLockGetterService',
    useClass: SimpleLockGetterServiceMock,
};
