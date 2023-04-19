import { Inject, Injectable } from '@nestjs/common';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { GenericSetterService } from '../../../services/generics/generic.setter.service';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';

@Injectable()
export class FeesCollectorSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'feesCollector';
    }

    async userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        value: EsdtTokenPayment[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(
                scAddress,
                'userRewardsForWeek',
                userAddress,
                week,
            ),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async setAccumulatedFees(
        scAddress: string,
        week: number,
        token: string,
        value: string,
    ): Promise<string> {
        return this.setData(
            this.getCacheKey(scAddress, 'accumulatedFees', week, token),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setAccumulatedLockedFees(
        scAddress: string,
        week: number,
        token: string,
        value: EsdtTokenPayment[],
    ): Promise<string> {
        return this.setData(
            this.getCacheKey(scAddress, 'accumulatedLockedFees', week, token),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }
}
