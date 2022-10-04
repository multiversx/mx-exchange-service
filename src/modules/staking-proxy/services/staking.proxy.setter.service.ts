import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TokenTtl } from 'src/helpers/cachingTTLs';
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

    async setLpFarmAddress(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'lpFarmAddress'),
            value,
            oneHour(),
        );
    }

    async setStakingFarmAddress(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(
                stakingProxyAddress,
                'stakingFarmAddress',
            ),
            value,
            oneHour(),
        );
    }

    async setPairAddress(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'pairAddress'),
            value,
            oneHour(),
        );
    }

    async setStakingTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'stakingTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setFarmTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'farmTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setDualYieldTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'dualYieldTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setLpFarmTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'lpFarmTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    private getStakeProxyCacheKey(stakingProxyAddress: string, ...args: any) {
        return generateCacheKeyFromParams(
            'stakeProxy',
            stakingProxyAddress,
            ...args,
        );
    }
}
