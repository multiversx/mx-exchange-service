import { CacheService } from 'src/services/caching/cache.service';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';

@Injectable()
export class WeekTimekeepingSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);

        this.baseKey = 'weekTimekeeping';
    }

    async currentWeek(scAddress: string, value: number): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('currentWeek', scAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async firstWeekStartEpoch(
        scAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('firstWeekStartEpoch', scAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async startEpochForWeek(
        scAddress: string,
        week: number,
        value: number,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('startEpochForWeek', scAddress, week),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async endEpochForWeek(
        scAddress: string,
        week: number,
        value: number,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('endEpochForWeek', scAddress, week),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }
}
