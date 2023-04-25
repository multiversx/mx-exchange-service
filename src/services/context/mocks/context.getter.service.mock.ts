import { ContextGetterService } from '../context.getter.service';

export class ContextGetterServiceMock {
    async getCurrentEpoch(): Promise<number> {
        return 1;
    }

    async getShardCurrentBlockNonce(shardID: number): Promise<number> {
        return 111;
    }
}

export const ContextGetterServiceProvider = {
    provide: ContextGetterService,
    useClass: ContextGetterServiceMock,
};
