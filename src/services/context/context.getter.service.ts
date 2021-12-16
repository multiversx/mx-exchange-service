import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { NftToken } from 'src/models/tokens/nftToken.model';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';

export class ContextGetterService {
    constructor(
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        remoteTtl: number,
        localTtl?: number,
    ): Promise<any> {
        const cacheKey = this.getContextCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                remoteTtl,
                localTtl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ContextGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        const cacheKey = this.getContextCacheKey(tokenID);
        return await this.getData(
            cacheKey,
            () => this.apiService.getService().getToken(tokenID),
            oneHour(),
        );
    }

    async getNftCollectionMetadata(collection: string): Promise<NftCollection> {
        const cacheKey = this.getContextCacheKey(collection);
        return await this.getData(
            cacheKey,
            () => this.apiService.getNftCollection(collection),
            oneHour(),
        );
    }

    async getNftMetadata(nftTokenID: string): Promise<NftToken> {
        const cacheKey = this.getContextCacheKey(nftTokenID);
        return await this.getData(
            cacheKey,
            () => this.apiService.getService().getNFTToken(nftTokenID),
            oneHour(),
        );
    }

    async getCurrentEpoch(): Promise<number> {
        const cacheKey = this.getContextCacheKey('currentEpoch');
        return await this.getData(
            cacheKey,
            async () => (await this.apiService.getStats()).epoch,
            oneMinute() * 10,
        );
    }

    async getShardCurrentBlockNonce(shardID: number): Promise<number> {
        const cacheKey = this.getContextCacheKey('shardBlockNonce', shardID);
        return await this.getData(
            cacheKey,
            () => this.apiService.getCurrentBlockNonce(shardID),
            oneSecond() * 3,
            oneSecond() * 6,
        );
    }

    private getContextCacheKey(...args: any) {
        return generateCacheKeyFromParams('context', ...args);
    }
}
