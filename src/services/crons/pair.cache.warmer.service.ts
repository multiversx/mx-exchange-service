import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { cacheConfig } from '../../config';
import { ContextService } from '../context/context.service';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { AbiPairService } from 'src/modules/pair/abi-pair.service';
import { PairService } from 'src/modules/pair/pair.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PairCacheWarmerService {
    constructor(
        private readonly pairService: PairService,
        private readonly abiPairService: AbiPairService,
        private readonly apiService: ElrondApiService,
        private readonly context: ContextService,
        private readonly cachingService: CachingService,
        @Inject('PUBSUB_SERVICE') private readonly client: ClientProxy,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePairs(): Promise<void> {
        const pairsMetadata = await this.context.getPairsMetadata();
        for (const pairMetadata of pairsMetadata) {
            await this.setPairCache(
                pairMetadata.address,
                'firstTokenID',
                pairMetadata.firstTokenID,
                cacheConfig.token,
            );
            await this.setPairCache(
                pairMetadata.address,
                'secondTokenID',
                pairMetadata.secondTokenID,
                cacheConfig.token,
            );

            const firstToken = await this.apiService
                .getService()
                .getESDTToken(pairMetadata.firstTokenID);
            await this.setContextCache(
                pairMetadata.firstTokenID,
                firstToken,
                cacheConfig.token,
            );

            const secondToken = await this.apiService
                .getService()
                .getESDTToken(pairMetadata.secondTokenID);
            await this.setContextCache(
                pairMetadata.secondTokenID,
                secondToken,
                cacheConfig.token,
            );

            const lpTokenID = await this.abiPairService.getLpTokenID(
                pairMetadata.address,
            );
            await this.setPairCache(
                pairMetadata.address,
                'lpTokenID',
                lpTokenID,
                cacheConfig.token,
            );

            const lpToken = await this.apiService
                .getService()
                .getESDTToken(lpTokenID);
            await this.setContextCache(lpTokenID, lpToken, cacheConfig.token);

            const state = await this.abiPairService.getState(
                pairMetadata.address,
            );
            await this.setPairCache(
                pairMetadata.address,
                'state',
                state,
                cacheConfig.token,
            );
        }
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async cachePairsInfo(): Promise<void> {
        const pairsAddress = await this.context.getAllPairsAddress();
        const promises = pairsAddress.map(async pairAddress => {
            const pairInfoMetadata = await this.abiPairService.getPairInfoMetadata(
                pairAddress,
            );
            await this.setPairCache(
                pairAddress,
                'valueLocked',
                pairInfoMetadata,
                cacheConfig.reserves,
            );
        });
        await Promise.all(promises);
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async cacheTokenPrices(): Promise<void> {
        const pairsAddress = await this.context.getAllPairsAddress();
        const firstTokensPromises = pairsAddress.map(async pairAddress => {
            const firstTokenPrice = await this.pairService.computeFirstTokenPrice(
                pairAddress,
            );
            await this.setPairCache(
                pairAddress,
                'firstTokenPrice',
                firstTokenPrice,
                cacheConfig.tokenPrice,
            );
        });
        const secondTokensPromises = pairsAddress.map(async pairAddress => {
            const secondTokenPrice = await this.pairService.computeSecondTokenPrice(
                pairAddress,
            );
            await this.setPairCache(
                pairAddress,
                'secondTokenPrice',
                secondTokenPrice,
                cacheConfig.tokenPrice,
            );
        });
        await Promise.all([...firstTokensPromises, ...secondTokensPromises]);
    }

    private async setPairCache(
        pairAddress: string,
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams('pair', pairAddress, key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        await this.deleteCacheKey(cacheKey);
    }

    private async setContextCache(
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams('context', key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        await this.deleteCacheKey(cacheKey);
    }

    private async deleteCacheKey(key: string) {
        await this.client.emit('deleteCacheKeys', [key]);
    }
}
