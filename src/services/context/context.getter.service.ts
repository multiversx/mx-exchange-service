import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneSecond } from 'src/helpers/helpers';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { GenericGetterService } from '../generics/generic.getter.service';

@Injectable()
export class ContextGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly apiService: ElrondApiService,
    ) {
        super(cachingService, logger);
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
