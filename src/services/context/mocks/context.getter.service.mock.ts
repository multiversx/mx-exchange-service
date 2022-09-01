export class ContextGetterServiceMock {
    async getCurrentEpoch(): Promise<number> {
        return 1;
    }
}
