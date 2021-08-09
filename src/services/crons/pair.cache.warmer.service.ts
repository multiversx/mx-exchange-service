import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { cacheConfig } from '../../config';
import { ContextService } from '../context/context.service';
import { RedisCacheService } from '../redis-cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { AbiPairService } from 'src/modules/pair/abi-pair.service';
import { PairService } from 'src/modules/pair/pair.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';

@Injectable()
export class PairCacheWarmerService {
    constructor(
        private readonly pairService: PairService,
        private readonly abiPairService: AbiPairService,
        private readonly apiService: ElrondApiService,
        private readonly context: ContextService,
        private readonly redisCacheService: RedisCacheService,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePairs(): Promise<void> {
        const pairsMetadata = await this.context.getPairsMetadata();
        for (const pairMetadata of pairsMetadata) {
            let cacheKey = generateCacheKeyFromParams(
                'pair',
                pairMetadata.address,
                'firstTokenID',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                pairMetadata.firstTokenID,
                cacheConfig.token,
            );

            cacheKey = generateCacheKeyFromParams(
                'pair',
                pairMetadata.address,
                'secondTokenID',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                pairMetadata.secondTokenID,
                cacheConfig.token,
            );

            const firstToken = await this.apiService
                .getService()
                .getESDTToken(pairMetadata.firstTokenID);
            cacheKey = generateCacheKeyFromParams(
                'context',
                pairMetadata.firstTokenID,
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                firstToken,
                cacheConfig.token,
            );

            const secondToken = await this.apiService
                .getService()
                .getESDTToken(pairMetadata.secondTokenID);
            cacheKey = generateCacheKeyFromParams(
                'context',
                pairMetadata.secondTokenID,
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                secondToken,
                cacheConfig.token,
            );

            const lpTokenID = await this.abiPairService.getLpTokenID(
                pairMetadata.address,
            );
            cacheKey = generateCacheKeyFromParams(
                'pair',
                pairMetadata.address,
                'lpTokenID',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                lpTokenID,
                cacheConfig.token,
            );

            const lpToken = await this.apiService
                .getService()
                .getESDTToken(lpTokenID);
            cacheKey = generateCacheKeyFromParams('context', lpTokenID);
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                lpToken,
                cacheConfig.token,
            );

            const state = await this.abiPairService.getState(
                pairMetadata.address,
            );
            cacheKey = generateCacheKeyFromParams(
                'pair',
                pairMetadata.address,
                'state',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                state,
                cacheConfig.reserves,
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
            const cacheKey = generateCacheKeyFromParams(
                'pair',
                pairAddress,
                'valueLocked',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
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
            const cacheKey = generateCacheKeyFromParams(
                'pair',
                pairAddress,
                'firstTokenPrice',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                firstTokenPrice,
                cacheConfig.tokenPrice,
            );
        });
        const secondTokensPromises = pairsAddress.map(async pairAddress => {
            const secondTokenPrice = await this.pairService.computeSecondTokenPrice(
                pairAddress,
            );
            const cacheKey = generateCacheKeyFromParams(
                'pair',
                pairAddress,
                'secondTokenPrice',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                secondTokenPrice,
                cacheConfig.tokenPrice,
            );
        });
        await Promise.all([...firstTokensPromises, ...secondTokensPromises]);
    }
}
