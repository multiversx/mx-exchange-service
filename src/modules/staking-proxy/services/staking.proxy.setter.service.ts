import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class StakingProxySetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
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
