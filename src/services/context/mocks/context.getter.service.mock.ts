import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ContextGetterService } from '../context.getter.service';
import { Injectable } from '@nestjs/common';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';

@Injectable()
export class ContextGetterServiceMock {
    constructor(private readonly mxApi: MXApiService) {}

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

    async getNftsForUser(
        address: string,
        from = 0,
        size = 100,
        type = 'MetaESDT',
        collections?: string[],
    ): Promise<NftToken[]> {
        return await this.mxApi.getNftsForUser(address);
    }
}

export const ContextGetterServiceProvider = {
    provide: ContextGetterService,
    useClass: ContextGetterServiceMock,
};
