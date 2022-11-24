import { Inject, Injectable } from '@nestjs/common';
import { CachingService } from '../../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { OutdatedContract } from '../../models/user.model';
import {
    GenericSetterService
} from '../../../../services/generics/generic.setter.service';
import { CacheTtlInfo } from '../../../../services/caching/cache.ttl.info';

@Injectable()
export class UserEnergySetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'userOutdatedContracts'
    }

    async setUserOutdatedContracts(userAddress: string, value: OutdatedContract[]): Promise<string> {
        return this.setData(
            this.getCacheKey(userAddress),
            () => value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        )
    }
}