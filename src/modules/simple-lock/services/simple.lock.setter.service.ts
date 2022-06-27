import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class SimpleLockSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setLockedTokenID(value: string): Promise<string> {
        return await this.setData(
            this.getSimpleLockCacheKey('lockedTokenID'),
            value,
            oneHour(),
        );
    }

    async getLpProxyTokenID(value: string): Promise<string> {
        return await this.setData(
            this.getSimpleLockCacheKey('lpProxyTokenID'),
            value,
            oneHour(),
        );
    }

    private getSimpleLockCacheKey(...args: any) {
        return generateCacheKeyFromParams('simpleLock', ...args);
    }
}
