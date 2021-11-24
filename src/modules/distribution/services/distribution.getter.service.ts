import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { CommunityDistributionModel } from '../models/distribution.model';
import { AbiDistributionService } from './abi-distribution.service';

@Injectable()
export class DistributionGetterService {
    constructor(
        private readonly abiService: AbiDistributionService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getDistributionCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                DistributionGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        return await this.getData(
            'communityDistribution',
            () => this.abiService.getCommunityDistribution(),
            oneMinute() * 5,
        );
    }

    private getDistributionCacheKey(...args: any) {
        return generateCacheKeyFromParams('distribution', ...args);
    }
}
