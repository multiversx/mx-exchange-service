import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { UserEntryModel } from '../models/metabonding.model';

@Injectable()
export class MetabondingSetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async setData(
        key: string,
        value: any,
        ttl: number,
    ): Promise<string> {
        const cacheKey = this.getMetabondingCacheKey(key);
        try {
            await this.cachingService.setCache(cacheKey, value, ttl);
            return cacheKey;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                MetabondingSetterService.name,
                this.setData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async setLockedAssetTokenID(value: string): Promise<string> {
        return await this.setData('lockedAssetTokenID', value, oneHour());
    }

    async setTotalLockedAssetSupply(value: string): Promise<string> {
        return await this.setData('lockedAssetTokenSupply', value, oneMinute());
    }

    async setUserEntry(
        userAddress: string,
        value: UserEntryModel,
    ): Promise<string> {
        return await this.setData(
            `${userAddress}.userEntry`,
            value,
            oneMinute() * 10,
        );
    }

    private getMetabondingCacheKey(...args: any) {
        return generateCacheKeyFromParams('metabonding', ...args);
    }
}
