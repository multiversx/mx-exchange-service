import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { UserEntryModel } from '../models/metabonding.model';

@Injectable()
export class MetabondingSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setLockedAssetTokenID(value: string): Promise<string> {
        return await this.setData(
            this.getMetabondingCacheKey('lockedAssetTokenID'),
            value,
            oneHour(),
        );
    }

    async setTotalLockedAssetSupply(value: string): Promise<string> {
        return await this.setData(
            this.getMetabondingCacheKey('lockedAssetTokenSupply'),
            value,
            oneMinute(),
        );
    }

    async setUserEntry(
        userAddress: string,
        value: UserEntryModel,
    ): Promise<string> {
        return await this.setData(
            this.getMetabondingCacheKey(`${userAddress}.userEntry`),
            value,
            oneMinute() * 10,
        );
    }

    private getMetabondingCacheKey(...args: any) {
        return generateCacheKeyFromParams('metabonding', ...args);
    }
}
