import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';

@Injectable()
export class StakingProxySetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'stakeProxy';
    }

    async setLpFarmAddress(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(stakingProxyAddress, 'lpFarmAddress'),
            value,
            oneHour(),
        );
    }

    async setStakingFarmAddress(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(
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
            this.getCacheKey(stakingProxyAddress, 'pairAddress'),
            value,
            oneHour(),
        );
    }

    async setStakingTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(stakingProxyAddress, 'stakingTokenID'),
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
            this.getCacheKey(stakingProxyAddress, 'farmTokenID'),
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
            this.getCacheKey(stakingProxyAddress, 'dualYieldTokenID'),
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
            this.getCacheKey(stakingProxyAddress, 'lpFarmTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }
}
