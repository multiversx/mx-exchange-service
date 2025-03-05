import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';

@Injectable()
export class SimpleLockSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'simpleLock';
    }

    async setLockedTokenID(
        simpleLockAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('lockedTokenID', simpleLockAddress),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setLpProxyTokenID(
        simpleLockAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('lpProxyTokenID', simpleLockAddress),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }
}
