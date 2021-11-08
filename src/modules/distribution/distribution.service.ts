import { Inject, Injectable } from '@nestjs/common';
import { cacheConfig, scAddress } from '../../config';
import {
    CommunityDistributionModel,
    DistributionModel,
} from './models/distribution.model';
import { AbiDistributionService } from './abi-distribution.service';
import { CachingService } from 'src/services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../utils/generate-log-message';

@Injectable()
export class DistributionService {
    constructor(
        private abiService: AbiDistributionService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getDistributionInfo(): Promise<DistributionModel> {
        return new DistributionModel({
            address: scAddress.distributionAddress,
        });
    }

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        const cacheKey = this.getDistributionCacheKey('communityDistribution');
        try {
            const getCommunityDistribution = () =>
                this.abiService.getCommunityDistribution();
            return await this.cachingService.getOrSet(
                cacheKey,
                getCommunityDistribution,
                cacheConfig.default,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                DistributionService.name,
                this.getCommunityDistribution.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getDistributedLockedAssets(userAddress: string): Promise<string> {
        try {
            const distributedLockedAssets = await this.abiService.getDistributedLockedAssets(
                userAddress,
            );
            return distributedLockedAssets.toFixed();
        } catch (error) {
            const logMessage = generateGetLogMessage(
                DistributionService.name,
                this.getDistributedLockedAssets.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    private getDistributionCacheKey(...args: any) {
        return generateCacheKeyFromParams('distribution', ...args);
    }
}
