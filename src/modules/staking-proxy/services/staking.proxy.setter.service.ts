import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from 'src/config';
import { oneHour } from 'src/helpers/helpers';
import { StakingSetterService } from 'src/modules/staking/services/staking.setter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';

@Injectable()
export class StakingProxySetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async setData(
        cacheKeyArg: string,
        value: any,
        ttl: number = cacheConfig.default,
    ): Promise<string> {
        const cacheKey = this.getStakeProxyCacheKey(cacheKeyArg);
        try {
            await this.cachingService.setCache(cacheKey, value, ttl);
            return cacheKey;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                StakingSetterService.name,
                '',
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async setLpFarmAddress(value: string): Promise<string> {
        return await this.setData('lpFarmAddress', value, oneHour());
    }

    async setStakingFarmAddress(value: string): Promise<string> {
        return await this.setData('stakingFarmAddress', value, oneHour());
    }

    async setPairAddress(value: string): Promise<string> {
        return await this.setData('pairAddress', value, oneHour());
    }

    async setStakingTokenID(value: string): Promise<string> {
        return await this.setData('stakingTokenID', value, oneHour());
    }

    async setFarmTokenID(value: string): Promise<string> {
        return await this.setData('farmTokenID', value, oneHour());
    }

    async setDualYieldTokenID(value: string): Promise<string> {
        return await this.setData('dualYieldTokenID', value, oneHour());
    }

    async setLpFarmTokenID(value: string): Promise<string> {
        return await this.setData('lpFarmTokenID', value, oneHour());
    }

    private getStakeProxyCacheKey(...args: any) {
        return generateCacheKeyFromParams('stakeProxy', ...args);
    }
}
