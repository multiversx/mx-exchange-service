import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from 'src/config';
import { oneSecond } from 'src/helpers/helpers';
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
        return await this.setData('lpFarmAddress', value, oneSecond());
    }

    async setStakingFarmAddress(value: string): Promise<string> {
        return await this.setData('stakingFarmAddress', value, oneSecond());
    }

    async setPairAddress(value: string): Promise<string> {
        return await this.setData('pairAddress', value, oneSecond());
    }

    async setStakingTokenID(value: string): Promise<string> {
        return await this.setData('stakingTokenID', value, oneSecond());
    }

    async setFarmTokenID(value: string): Promise<string> {
        return await this.setData('farmTokenID', value, oneSecond());
    }

    async setDualYieldTokenID(value: string): Promise<string> {
        return await this.setData('dualYieldTokenID', value, oneSecond());
    }

    async setLpFarmTokenID(value: string): Promise<string> {
        return await this.setData('lpFarmTokenID', value, oneSecond());
    }

    private getStakeProxyCacheKey(...args: any) {
        return generateCacheKeyFromParams('stakeProxy', ...args);
    }
}
