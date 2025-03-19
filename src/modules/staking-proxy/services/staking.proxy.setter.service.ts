import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';

@Injectable()
export class StakingProxySetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'stakeProxy';
    }

    async setLpFarmAddress(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('lpFarmAddress', stakingProxyAddress),
            value,
            Constants.oneHour(),
        );
    }

    async setStakingFarmAddress(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('stakingFarmAddress', stakingProxyAddress),
            value,
            Constants.oneHour(),
        );
    }

    async setPairAddress(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('pairAddress', stakingProxyAddress),
            value,
            Constants.oneHour(),
        );
    }

    async setStakingTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('stakingTokenID', stakingProxyAddress),
            value,
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async setFarmTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('farmTokenID', stakingProxyAddress),
            value,
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async setDualYieldTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('dualYieldTokenID', stakingProxyAddress),
            value,
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async setLpFarmTokenID(
        stakingProxyAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('lpFarmTokenID', stakingProxyAddress),
            value,
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }
}
