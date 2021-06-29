import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../cache-manager/cache-manager.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';

@Injectable()
export class HyperblockService {
    private readonly metachainID: number;

    constructor(
        private readonly cachingService: CacheManagerService,
        private readonly elrondApi: ElrondApiService,
    ) {
        this.metachainID = 4294967295;
    }

    async getCurrentNonce(): Promise<number> {
        const shardInfo = await this.elrondApi.getCurrentNonce(
            this.metachainID,
        );
        return shardInfo.data.status.erd_nonce;
    }

    async getLastProcessedNonce(): Promise<number | undefined> {
        const cachedData = await this.cachingService.getLastProcessedNonce();
        if (!!cachedData) {
            return cachedData.lastProcessedNonce;
        }
        return undefined;
    }

    async setLastProcessedNonce(nonce: number): Promise<void> {
        this.cachingService.setLastProcessedNonce({
            lastProcessedNonce: nonce,
        });
    }

    async getHyperblockByNonce(nonce: number): Promise<any> {
        return this.elrondApi.getHyperblockByNonce(nonce);
    }
}
