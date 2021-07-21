import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PairService } from '../../modules/pair/pair.service';
import { PriceFeedService } from '../price-feed/price-feed.service';
import { cacheConfig, farmsConfig, tokensPriceData } from '../../config';
import { ContextService } from '../context/context.service';
import { FarmStatisticsService } from 'src/modules/farm/farm-statistics.service';
import { RedisCacheService } from '../redis-cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { AbiPairService } from 'src/modules/pair/abi-pair.service';

@Injectable()
export class CacheWarmerService {
    constructor(
        private readonly priceFeed: PriceFeedService,
        private readonly pairService: PairService,
        private readonly redlockService: RedlockService,
        private readonly context: ContextService,
        private readonly farmStatisticsService: FarmStatisticsService,
        private readonly redisCacheService: RedisCacheService,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePairsInfo(): Promise<void> {
        const pairsAddress = await this.context.getAllPairsAddress();
        const promises = pairsAddress.map(async pairAddress => {
            const resource = `${pairAddress}.pairInfo`;
            const lockExpire = 20;
            let lock;

            try {
                lock = await this.redlockService.lockTryOnce(
                    resource,
                    lockExpire,
                );
            } catch (e) {
                return;
            }
            if (lock === 0) {
                return;
            }

            return this.pairService.getPairInfoMetadata(pairAddress);
        });
        await Promise.all(promises);
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
