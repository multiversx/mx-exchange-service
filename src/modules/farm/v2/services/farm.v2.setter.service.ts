import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { Logger } from 'winston';
import { FarmSetterService } from '../../base-module/services/farm.setter.service';

@Injectable()
export class FarmSetterServiceV2 extends FarmSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        value: EsdtTokenPayment[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(
                'userRewardsForWeek',
                scAddress,
                userAddress,
                week,
            ),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async setUserTotalFarmPosition(
        farmAddress: string,
        userAddress: string,
        value: string,
    ): Promise<string> {
        return this.setData(
            this.getCacheKey('userTotalFarmPosition', farmAddress, userAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }
}
