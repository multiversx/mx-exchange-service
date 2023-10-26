import { ContextGetterService } from '../context.getter.service';

export class ContextGetterServiceMock {
    async getCurrentEpoch(): Promise<number> {
        return 1;
    }

    async getShardCurrentBlockNonce(shardID: number): Promise<number> {
        return 111;
    }

    async getBlocksCountInEpoch(
        epoch: number,
        shardId: number,
    ): Promise<number> {
        return 10 * 60 * 24;
    }
}

export const ContextGetterServiceProvider = {
    provide: ContextGetterService,
    useClass: ContextGetterServiceMock,
};
