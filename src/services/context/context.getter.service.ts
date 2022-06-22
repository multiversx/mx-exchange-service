import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { GenericGetterService } from '../generics/generic.getter.service';

export class ContextGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly apiService: ElrondApiService,
    ) {
        super(cachingService, logger);
    }

    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        if (tokenID === undefined) {
            return undefined;
        }
        const cacheKey = this.getContextCacheKey(tokenID);
        return await this.getData(
            cacheKey,
            () => this.apiService.getToken(tokenID),
            oneMinute() * 2,
        );
    }

    async getNftCollectionMetadata(collection: string): Promise<NftCollection> {
        const cacheKey = this.getContextCacheKey(collection);
        return await this.getData(
            cacheKey,
            () => this.apiService.getNftCollection(collection),
            oneMinute() * 2,
        );
    }

    async getCurrentEpoch(): Promise<number> {
        const cacheKey = this.getContextCacheKey('currentEpoch');
        return await this.getData(
            cacheKey,
            async () => (await this.apiService.getStats()).epoch,
            oneSecond() * 6,
        );
    }

    async getShardCurrentBlockNonce(shardID: number): Promise<number> {
        const cacheKey = this.getContextCacheKey('shardBlockNonce', shardID);
        return await this.getData(
            cacheKey,
            () => this.apiService.getCurrentBlockNonce(shardID),
            oneSecond() * 6,
        );
    }

    private getContextCacheKey(...args: any) {
        return generateCacheKeyFromParams('context', ...args);
    }
}
