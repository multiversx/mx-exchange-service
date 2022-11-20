import { Inject, Injectable } from '@nestjs/common';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { Mixin } from 'ts-mixer';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import {
    GenericSetterService
} from '../../../services/generics/generic.setter.service';
import {
    WeeklyRewardsSplittingSetterService
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.setter.service';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';

@Injectable()
export class FeesCollectorSetterService extends Mixin(GenericSetterService, WeeklyRewardsSplittingSetterService) {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setAccumulatedFees(scAddress: string, week: number, token: string, value: string): Promise<string> {
        return this.setData(
            this.getFeesCollectorCacheKey(scAddress, 'accumulatedFees', week, token),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        )
    }

    async setAccumulatedLockedFees(scAddress: string, week: number, token: string, value: EsdtTokenPayment[]): Promise<string> {
        return this.setData(
            this.getFeesCollectorCacheKey(scAddress, 'accumulatedLockedFees', week, token),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        )
    }

    private getFeesCollectorCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams(address, ...args);
    }


}
