import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { PendingExecutor } from 'src/utils/pending.executor';
import { Logger } from 'winston';

@Injectable()
export class CMCApiService {
    private BASE_URL: string;
    private genericGetExecutor: PendingExecutor<any, any>;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        this.BASE_URL = apiConfigService.getCoinMarketCapURL();

        this.genericGetExecutor = new PendingExecutor(
            async <T>(args: { uri: string; params: any }): Promise<T> => {
                try {
                    const result = await axios.get<T>(
                        `${this.BASE_URL}/${args.uri}`,
                        {
                            params: args.params,
                            headers: {
                                'X-CMC_PRO_API_KEY':
                                    this.apiConfigService.getCoinMarketCapAccessToken(),
                            },
                        },
                    );
                    return result.data;
                } catch (error: any) {
                    const customError = {
                        method: 'GET',
                        uri: args.uri,
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

    async get<T>(uri: string, params: any): Promise<T> {
        return await this.genericGetExecutor.execute({ uri, params });
    }

    async getUSDCPrice(): Promise<number> {
        try {
            const result = await this.get<any>(
                'v2/cryptocurrency/quotes/latest',
                {
                    symbol: 'USDC',
                },
            );
            return result.data.USDC[0].quote.USD.price;
        } catch (error) {
            this.logger.error(`${CMCApiService}`, error);
            return 1;
        }
    }
}
