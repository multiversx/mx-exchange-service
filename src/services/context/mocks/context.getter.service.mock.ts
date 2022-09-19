export class ContextGetterServiceMock {
    async getCurrentEpoch(): Promise<number> {
        return 1;
    }

    async getShardCurrentBlockNonce(shardID: number): Promise<number> {
        return 111;
    }
}
