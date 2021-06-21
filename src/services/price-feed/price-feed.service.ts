import { Injectable } from '@nestjs/common';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { elrondConfig } from '../../config';
import { CacheManagerService } from '../cache-manager/cache-manager.service';

@Injectable()
export class PriceFeedService {
    private readonly priceFeedUrl: string;
    private readonly timeoutLimit: number;

    constructor(private cacheService: CacheManagerService) {
        this.priceFeedUrl = elrondConfig.elrondData;
        this.timeoutLimit = elrondConfig.timeoutLimit;
    }

    async getTokenPrice(tokenName: string): Promise<BigNumber> {
        const cachedData = await this.cacheService.getPriceFeed(tokenName);
        if (!!cachedData) {
            return new BigNumber(cachedData.priceFeed);
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
            console.log({ priceFeed: error });
        }
    }
}
