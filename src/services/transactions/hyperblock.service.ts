import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import {
    generateGetLogMessage,
    generateSetLogMessage,
} from '../../utils/generate-log-message';
import { MetricsCollector } from '../../utils/metrics.collector';

@Injectable()
export class HyperblockService {
    private readonly metachainID: number;

    constructor(
        private readonly elrondApi: ElrondApiService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.metachainID = 4294967295;
    }

    getShardID(): number {
        return this.metachainID;
    }

    async getCurrentNonce(): Promise<number> {
        const shardInfo = await this.elrondApi.getCurrentNonce(
            this.metachainID,
        );
        const currentNonce = shardInfo.data.status.erd_nonce;
        MetricsCollector.setCurrentNonce(this.metachainID, currentNonce);
        return currentNonce;
    }

    async getLastProcessedNonce(): Promise<number | undefined> {
        const cacheKey = this.getHyperblockCacheKey('lastPorcessedNonce');
        try {
            return this.cachingService.get(cacheKey);
        } catch (error) {
            const logMessage = generateGetLogMessage(
                HyperblockService.name,
                this.getLastProcessedNonce.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async setLastProcessedNonce(nonce: number): Promise<void> {
        const cacheKey = this.getHyperblockCacheKey('lastPorcessedNonce');
        try {
            this.cachingService.set(cacheKey, nonce, Number.MAX_SAFE_INTEGER);
        } catch (error) {
            const logMessage = generateSetLogMessage(
                HyperblockService.name,
                this.getLastProcessedNonce.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getHyperblockByNonce(nonce: number): Promise<any> {
        return this.elrondApi.getHyperblockByNonce(nonce);
    }

    private getHyperblockCacheKey(...args: any) {
        return generateCacheKeyFromParams('hyperblock', ...args);
    }
}
