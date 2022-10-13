import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';
import { UserEntryModel } from '../models/metabonding.model';

@Injectable()
export class MetabondingSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'metabonding';
    }

    async setLockedAssetTokenID(value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('lockedAssetTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setTotalLockedAssetSupply(value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('lockedAssetTokenSupply'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setUserEntry(
        userAddress: string,
        value: UserEntryModel,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(`${userAddress}.userEntry`),
            value,
            oneMinute() * 10,
        );
    }
}
