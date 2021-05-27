import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { elrondConfig } from '../../config';

@Injectable()
export class PriceFeedService {
    private readonly priceFeedUrl: string;
    private readonly timeoutLimit: number;

    constructor() {
        this.priceFeedUrl = elrondConfig.elrondData;
        this.timeoutLimit = elrondConfig.timeoutLimit;
    }

    async getTokenPrice(tokenName: string): Promise<number> {
        const response = await this.doGet(`latest/quotes/${tokenName}/price`);
        return response;
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
