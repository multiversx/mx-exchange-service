import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { RedisCacheService } from '../redis-cache.service';
import * as Redis from 'ioredis';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';

@Injectable()
export class HyperblockService {
    private readonly metachainID: number;
    private redisClient: Redis.Redis;

    constructor(
        private readonly elrondApi: ElrondApiService,
        private readonly redisCacheService: RedisCacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.metachainID = 4294967295;
        this.redisClient = this.redisCacheService.getClient();
    }

    async getCurrentNonce(): Promise<number> {
        const shardInfo = await this.elrondApi.getCurrentNonce(
            this.metachainID,
        );
        return shardInfo.data.status.erd_nonce;
    }

    async getLastProcessedNonce(): Promise<number | undefined> {
        try {
            const cacheKey = this.getHyperblockCacheKey('lastPorcessedNonce');
            return this.redisCacheService.get(this.redisClient, cacheKey);
        } catch (error) {
            this.logger.error(
                `An error occurred while get last processed nonce`,
                error,
                {
                    path: 'HyperblockService.getLastProcessedNonce',
                },
            );
        }
    }

    async setLastProcessedNonce(nonce: number): Promise<void> {
        try {
            const cacheKey = this.getHyperblockCacheKey('lastPorcessedNonce');
            this.redisCacheService.set(
                this.redisClient,
                cacheKey,
                nonce,
                Number.MAX_SAFE_INTEGER,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while set last processed nonce`,
                error,
                {
                    path: 'HyperblockService.setLastProcessedNonce',
                },
            );
        }
    }

    async getHyperblockByNonce(nonce: number): Promise<any> {
        return this.elrondApi.getHyperblockByNonce(nonce);
    }

    private getHyperblockCacheKey(...args: any) {
        return generateCacheKeyFromParams('hyperblock', args);
    }
}
