import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
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

    async setLockedTokenID(
        simpleLockAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getSimpleLockCacheKey(simpleLockAddress, 'lockedTokenID'),
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
            this.getSimpleLockCacheKey(simpleLockAddress, 'lpProxyTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    private getSimpleLockCacheKey(simpleLockAddress: string, ...args: any) {
        return generateCacheKeyFromParams(
            'simpleLock',
            simpleLockAddress,
            ...args,
        );
    }
}
