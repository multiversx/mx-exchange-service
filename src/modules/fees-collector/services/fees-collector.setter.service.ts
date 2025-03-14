import { Inject, Injectable } from '@nestjs/common';
import { CacheService } from 'src/services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { GenericSetterService } from '../../../services/generics/generic.setter.service';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';

@Injectable()
export class FeesCollectorSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
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

    async accumulatedFees(
        week: number,
        token: string,
        value: string,
    ): Promise<string> {
        return this.setData(
            this.getCacheKey('accumulatedFees', week, token),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async allTokens(tokens: string[]): Promise<string> {
        return this.setData(
            this.getCacheKey('allTokens'),
            tokens,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async accumulatedFeesUntilNow(
        scAddress: string,
        week: number,
        value: string,
    ): Promise<string> {
        return this.setData(
            this.getCacheKey('accumulatedFeesUntilNow', scAddress, week),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }
}
