import { EnergyType } from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';

@Injectable()
export class EnergySetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'energy';
    }

    @ErrorLoggerAsync()
    async setBaseAssetTokenID(value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('baseAssetTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    @ErrorLoggerAsync()
    async setLockOptions(values: number[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('lockOptions'),
            values,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    @ErrorLoggerAsync()
    async setPauseState(value: boolean): Promise<string> {
        return await this.setData(
            this.getCacheKey('isPaused'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    @ErrorLoggerAsync()
    async setEnergyEntryForUser(
        userAddress: string,
        value: EnergyType,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('energyEntryForUser', userAddress),
            value,
            Constants.oneMinute(),
        );
    }
}
