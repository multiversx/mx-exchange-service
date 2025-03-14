import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { PendingExecutor } from 'src/utils/pending.executor';
import { Logger } from 'winston';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable()
export class MXDataApiService {
    private BASE_URL: string;
    private genericGetExecutor: PendingExecutor<any, any>;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        private readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        this.BASE_URL = this.apiConfigService.getMXDataApiURL();

        this.genericGetExecutor = new PendingExecutor(
            async <T>(uri: string): Promise<T> => {
                try {
                    const result = await axios.get<T>(
                        `${this.BASE_URL}/${uri}`,
                    );
                    return result.data;
                } catch (error: any) {
                    const customError = {
                        method: 'GET',
                        uri,
                        response: error.response?.data,
                        status: error.response?.status,
                        message: error.message,
                        name: error.name,
                    };

                    throw customError;
                }
            },
        );
    }

    async get<T>(uri: string): Promise<T> {
        return await this.genericGetExecutor.execute(uri);
    }

    async getTokenPriceRaw(tokenTicker: string): Promise<number> {
        try {
            return await this.get<number>(
                `v1/quotes/cex/${tokenTicker}?extract=price`,
            );
        } catch (error) {
            this.logger.error(`${MXDataApiService.name}`, error);
            return 1;
        }
    }

    async getTokenPrice(tokenTicker: string): Promise<number> {
        return await this.cachingService.getOrSet(
            `token.${tokenTicker}.externalPrice`,
            () => this.getTokenPriceRaw(tokenTicker),
            Constants.oneMinute() * 10,
            Constants.oneMinute() * 7,
        );
    }

    async setTokenPrice(tokenTicker: string, price: number): Promise<string> {
        const key = `token.${tokenTicker}.externalPrice`;
        await this.cachingService.set(
            key,
            price,
            Constants.oneMinute() * 10,
            Constants.oneMinute() * 7,
        );
        return key;
    }
}
