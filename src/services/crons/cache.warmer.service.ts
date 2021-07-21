import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceFeedService } from '../price-feed/price-feed.service';
import { cacheConfig, farmsConfig, tokensPriceData } from '../../config';
import { ContextService } from '../context/context.service';
import { FarmStatisticsService } from 'src/modules/farm/farm-statistics.service';
import { RedisCacheService } from '../redis-cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { AbiPairService } from 'src/modules/pair/abi-pair.service';
import { PairService } from 'src/modules/pair/pair.service';

@Injectable()
export class CacheWarmerService {
    constructor(
        private readonly priceFeed: PriceFeedService,
        private readonly pairService: PairService,
        private readonly abiPairService: AbiPairService,
        private readonly context: ContextService,
        private readonly farmStatisticsService: FarmStatisticsService,
        private readonly redisCacheService: RedisCacheService,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
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

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePriceFeeds(): Promise<void> {
        for (const priceFeed in tokensPriceData) {
            const tokenPrice = await this.priceFeed.getTokenPriceRaw(
                tokensPriceData.get(priceFeed),
            );
            const cacheKey = generateCacheKeyFromParams(
                'priceFeed',
                tokensPriceData.get(priceFeed),
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                tokenPrice,
                cacheConfig.reserves,
            );
        }
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
            const firstTokenPrice = await this.pairService.computeFirstTokenPrice(
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
                firstTokenPrice,
                cacheConfig.tokenPrice,
            );
        });
        await Promise.all([firstTokensPromises, secondTokensPromises]);
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheApr(): Promise<void> {
        for (const farmAddress of farmsConfig) {
            const apr = await this.farmStatisticsService.computeFarmAPR(
                farmAddress,
            );
            const cacheKey = generateCacheKeyFromParams(
                'farmStatistics',
                farmAddress,
                'apr',
            );

            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                apr,
                cacheConfig.apr,
            );
        }
    }
}
