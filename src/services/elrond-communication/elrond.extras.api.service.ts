import { Inject, Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { oneMinute } from 'src/helpers/helpers';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';

@Injectable()
export class ElrondExtrasApiService {
    private axios = require('axios');
    private extrasUrl: string;

    constructor(
        private readonly cachingService: CachingService,
        private readonly configService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.extrasUrl = this.configService.getElrondExtrasUrl();
    }

    async doGetGeneric(name: string, resourceUrl: string): Promise<any> {
        const profiler = new PerformanceProfiler(`${name} ${resourceUrl}`);
        const globalAuthToken = this.configService.getGlobalJWTToken();
        const options: AxiosRequestConfig = {
            headers: {
                Authorization: `Bearer ${globalAuthToken}`,
            },
        };

        const response = await this.axios.get(resourceUrl, options);

        profiler.stop();

        MetricsCollector.setExternalCall(
            ElrondExtrasApiService.name,
            name,
            profiler.duration,
        );

        return response;
    }

    async getBattleOfYieldsList(): Promise<string[]> {
        const cacheKey = generateCacheKeyFromParams(
            'battleOfYields',
            'addresses',
        );
        const getAddresses = async () => {
            const response = await this.doGetGeneric(
                this.getBattleOfYieldsList.name,
                `${this.extrasUrl}/battle-of-yields/list`,
            );
            return response.data.map(data => data.address);
        };

        try {
            return this.cachingService.getOrSet(
                cacheKey,
                getAddresses,
                oneMinute() * 5,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ElrondExtrasApiService.name,
                this.getBattleOfYieldsList.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
