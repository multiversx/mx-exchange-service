import { Inject, Injectable } from '@nestjs/common';
import { cacheConfig, scAddress } from '../../config';
import {
    CommunityDistributionModel,
    DistributionModel,
} from './models/distribution.model';
import { AbiDistributionService } from './abi-distribution.service';
import { RedisCacheService } from 'src/services/redis-cache.service';
import * as Redis from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';

@Injectable()
export class DistributionService {
    private redisClient: Redis.Redis;
    constructor(
        private abiService: AbiDistributionService,
        private readonly redisCacheService: RedisCacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.redisClient = this.redisCacheService.getClient();
    }

    async getDistributionInfo(): Promise<DistributionModel> {
        return new DistributionModel({
            address: scAddress.distributionAddress,
        });
    }

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        try {
            const cacheKey = this.getDistributionCacheKey(
                'communityDistribution',
            );
            const getCommunityDistribution = () =>
                this.abiService.getCommunityDistribution();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getCommunityDistribution,
                cacheConfig.default,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get community distribution`,
                error,
                {
                    path: 'DistributionService.getCommunityDistribution',
                },
            );
        }
    }

    async getDistributedLockedAssets(userAddress: string): Promise<string> {
        const distributedLockedAssets = await this.abiService.getDistributedLockedAssets(
            userAddress,
        );
        return distributedLockedAssets.toFixed();
    }

    private getDistributionCacheKey(...args: any) {
        return generateCacheKeyFromParams('distribution', ...args);
    }
}
