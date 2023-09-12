import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
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
            Constants.oneHour(),
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
            Constants.oneHour(),
        );
    }

    async setPairAddress(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'pairAddress'),
            value,
            Constants.oneHour(),
        );
    }

    async setStakingTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'stakingTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setFarmTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'farmTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setDualYieldTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'dualYieldTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setLpFarmTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'lpFarmTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
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
