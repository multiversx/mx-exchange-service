import { Injectable } from '@nestjs/common';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { elrondConfig } from '../../config';

@Injectable()
export class PriceFeedService {
    private readonly priceFeedUrl: string;
    private readonly timeoutLimit: number;

    constructor() {
        this.priceFeedUrl = elrondConfig.elrondData;
        this.timeoutLimit = elrondConfig.timeoutLimit;
    }

    async getTokenPrice(tokenName: string): Promise<BigNumber> {
        const response = await this.doGet(`latest/quotes/${tokenName}/price`);
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
