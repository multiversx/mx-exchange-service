import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from 'src/config';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { SCAddressType } from './models/sc-address.model';

@Injectable()
export class RemoteConfigSetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async setData(
        name: string,
        value: any,
        ttl: number = cacheConfig.default,
    ): Promise<string> {
        const cacheKey = this.getFlagCacheKey(name);
        try {
            await this.cachingService.setCache(cacheKey, value, ttl);
            return cacheKey;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                RemoteConfigSetterService.name,
                '',
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async setFlag(name: string, value: boolean): Promise<string> {
        return await this.setData(name, value, oneHour());
    }

    async deleteFlag(name: string): Promise<void> {
        await this.cachingService.delete(this.getFlagCacheKey(name));
    }

    async setStakingAddresses(
        addresses: string[],
        category: SCAddressType,
    ): Promise<string> {
        return await this.setData(category, addresses, oneHour());
    }

    async setStakingProxyAddresses(
        addresses: string[],
        category: SCAddressType,
    ): Promise<string> {
        return await this.setData(category, addresses, oneHour());
    }

    async deleteSCAddresses(category: SCAddressType): Promise<void> {
        await this.cachingService.delete(this.getSCAddressCacheKey(category));
    }

    private getFlagCacheKey(flagName: string, ...args: any) {
        return generateCacheKeyFromParams('flag', flagName, ...args);
    }

    private getSCAddressCacheKey(category: SCAddressType, ...args: any) {
        return generateCacheKeyFromParams('scAddress', category, ...args);
    }
}
