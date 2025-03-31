import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { Logger } from 'winston';
import { CacheService } from 'src/services/caching/cache.service';
import { MXApiService } from '../multiversx-communication/mx.api.service';
import { GenericGetterService } from '../generics/generic.getter.service';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';

@Injectable()
export class ContextGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly apiService: MXApiService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'context';
    }

    async getCurrentEpoch(): Promise<number> {
        const cacheKey = this.getCacheKey('currentEpoch');
        return await this.getData(
            cacheKey,
            async () => (await this.apiService.getStats()).epoch,
            Constants.oneMinute(),
        );
    }

    async getBlocksCountInEpoch(
        epoch: number,
        shardId: number,
    ): Promise<number> {
        const cacheKey = this.getCacheKey('blocksCountInEpoch', shardId, epoch);
        let ttl = Constants.oneMonth();
        const currentEpoch = await this.getCurrentEpoch();
        if (currentEpoch === epoch) {
            ttl = Constants.oneMinute();
        }
        return await this.getData(
            cacheKey,
            async () =>
                await this.apiService.getShardBlockCountInEpoch(epoch, shardId),
            ttl,
        );
    }

    async getShardCurrentBlockNonce(shardID: number): Promise<number> {
        const cacheKey = this.getCacheKey('shardBlockNonce', shardID);
        return await this.getData(
            cacheKey,
            () => this.apiService.getCurrentBlockNonce(shardID),
            Constants.oneMinute(),
        );
    }

    async getNftsForUser(
        address: string,
        from = 0,
        size = 100,
        type = 'MetaESDT',
        collections?: string[],
    ): Promise<NftToken[]> {
        const nfts = await this.apiService.getNftsForUser(address, type);

        const userNfts = collections
            ? nfts
                  .filter((nft) => collections.includes(nft.collection))
                  .slice(from, size)
            : nfts.slice(from, size);

        return userNfts;
    }
}
