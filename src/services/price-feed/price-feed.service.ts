import { HttpService, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig, elrondConfig } from '../../config';
import { RedisCacheService } from '../redis-cache.service';
import * as Redis from 'ioredis';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class PriceFeedService {
    private readonly priceFeedUrl: string;
    private redisClient: Redis.Redis;

    constructor(
        private readonly httpService: HttpService,
        private readonly redisCacheService: RedisCacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.priceFeedUrl = elrondConfig.elrondData;
        this.redisClient = this.redisCacheService.getClient();
    }

    async getTokenPrice(tokenName: string): Promise<BigNumber> {
        try {
            const cacheKey = this.getPriceFeedCacheKey(tokenName);
            const getTokenPrice = () => this.getTokenPriceRaw(tokenName);

            const tokenPrice = await this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getTokenPrice,
                cacheConfig.priceFeed,
            );
            return new BigNumber(tokenPrice);
        } catch (error) {
            this.logger.error(
                `An error occurred while get token price feed`,
                error,
                {
                    path: 'PriceFeedService.getTokenPrice',
                },
            );
        }
    }

    async getTokenPriceRaw(tokenName: string): Promise<string> {
        const tokenPrice = await this.httpService
            .get(`${this.priceFeedUrl}/latest/quotes/${tokenName}/price`)
            .toPromise();

        return tokenPrice.data;
    }

    private getPriceFeedCacheKey(...args: any) {
        return generateCacheKeyFromParams('priceFeed', args);
    }
}
