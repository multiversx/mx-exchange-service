import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { Logger } from 'winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
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

    async getNftsCountForUser(address: string): Promise<number> {
        const cacheKey = this.getCacheKey('nftsCountForUser', address);
        const cachedData = await this.cachingService.getRemote<number>(
            cacheKey,
        );
        if (cachedData) {
            return cachedData;
        }
        const count = await this.apiService.getNftsCountForUser(address);
        await this.cachingService.setRemote(
            cacheKey,
            count,
            Constants.oneSecond() * 6,
        );
        return count;
    }

    async getNftsForUser(
        address: string,
        from = 0,
        size = 100,
        type = 'MetaESDT',
        collections?: string[],
    ): Promise<NftToken[]> {
        const cacheKey = this.getCacheKey('nftsForUser', address, from, size);
        let nfts = await this.cachingService.getRemote<NftToken[]>(cacheKey);
        if (nfts) {
            const userNfts = collections
                ? nfts
                      .filter((nft) => collections.includes(nft.collection))
                      .slice(from, size)
                : nfts.slice(from, size);
            return userNfts;
        }

        nfts = await this.apiService.getNftsForUser(address, type);
        await this.cachingService.setRemote(
            cacheKey,
            nfts,
            Constants.oneSecond() * 6,
        );

        const userNfts = collections
            ? nfts
                  .filter((nft) => collections.includes(nft.collection))
                  .slice(from, size)
            : nfts.slice(from, size);

        return userNfts;
    }
}
