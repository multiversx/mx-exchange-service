import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { elrondConfig, tokensPriceData } from '../../config';
import { CacheManagerService } from '../cache-manager/cache-manager.service';
import { RedlockService } from '../redlock';

@Injectable()
export class PriceFeedService {
    private readonly priceFeedUrl: string;
    private readonly timeoutLimit: number;

    constructor(
        private redlockService: RedlockService,
        private cacheService: CacheManagerService,
    ) {
        this.priceFeedUrl = elrondConfig.elrondData;
        this.timeoutLimit = elrondConfig.timeoutLimit;
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePriceFeeds(): Promise<void> {
        for (const priceFeed in tokensPriceData) {
            const resource = `priceFeed.${priceFeed}`;
            const lockExpire = 5;
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
            await this.getTokenPrice(tokensPriceData.get(priceFeed));
        }
    }

    async getTokenPrice(tokenName: string): Promise<BigNumber> {
        const cachedData = await this.cacheService.getPriceFeed(tokenName);
        if (!!cachedData) {
            return cachedData.priceFeed;
        }
        const response = await this.doGet(`latest/quotes/${tokenName}/price`);
        this.cacheService.setPriceFeed(tokenName, {
            priceFeed: new BigNumber(response),
        });
        return new BigNumber(response);
    }

    private async doGet(resourceUrl: string): Promise<any> {
        try {
            const url = `${this.priceFeedUrl}/${resourceUrl}`;
            const response = await axios.get(url, {
                timeout: this.timeoutLimit,
            });
            const payload = response.data;
            return payload;
        } catch (error) {
            console.log(error);
        }
    }
}
