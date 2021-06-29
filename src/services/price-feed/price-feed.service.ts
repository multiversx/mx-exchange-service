import { HttpService, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig } from '../../config';
import { CacheManagerService } from '../cache-manager/cache-manager.service';

@Injectable()
export class PriceFeedService {
    private readonly priceFeedUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly cacheService: CacheManagerService,
    ) {
        this.priceFeedUrl = elrondConfig.elrondData;
    }

    async getTokenPrice(tokenName: string): Promise<BigNumber> {
        const cachedData = await this.cacheService.getPriceFeed(tokenName);
        if (!!cachedData) {
            return new BigNumber(cachedData.priceFeed);
        }
        const response = await this.httpService
            .get(`${this.priceFeedUrl}/latest/quotes/${tokenName}/price`)
            .toPromise();

        this.cacheService.setPriceFeed(tokenName, {
            priceFeed: new BigNumber(response.data),
        });

        return new BigNumber(response.data);
    }
}
