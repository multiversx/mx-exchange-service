import { HttpService, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from '../caching/cache.service';
import * as Redis from 'ioredis';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { Logger } from 'winston';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { PerformanceProfiler } from '../../utils/performance.profiler';
import { MetricsCollector } from '../../utils/metrics.collector';
import { oneMinute } from '../../helpers/helpers';

@Injectable()
export class PriceFeedService {
    private readonly priceFeedUrl: string;
    private redisClient: Redis.Redis;

    constructor(
        private readonly httpService: HttpService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.priceFeedUrl = process.env.ELRONDDATA_URL;
        this.redisClient = this.cachingService.getClient();
    }

    async getTokenPrice(tokenName: string): Promise<BigNumber> {
        const cacheKey = this.getPriceFeedCacheKey(tokenName);
        try {
            const getTokenPrice = () => this.getTokenPriceRaw(tokenName);

            const tokenPrice = await this.cachingService.getOrSet(
                this.redisClient,
                cacheKey,
                getTokenPrice,
                oneMinute(),
            );
            return new BigNumber(tokenPrice);
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PriceFeedService.name,
                this.getTokenPrice.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getTokenPriceRaw(tokenName: string): Promise<BigNumber> {
        const profiler = new PerformanceProfiler();
        const tokenPrice = await this.httpService
            .get(`${this.priceFeedUrl}/latest/quotes/${tokenName}/price`)
            .toPromise();
        profiler.stop();
        MetricsCollector.setExternalCall(
            PriceFeedService.name,
            this.getTokenPriceRaw.name,
            profiler.duration,
        );
        return tokenPrice.data;
    }

    private getPriceFeedCacheKey(...args: any) {
        return generateCacheKeyFromParams('priceFeed', ...args);
    }
}
