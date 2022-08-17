import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class TokenSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setDerivedEGLD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            this.getTokenCacheKey(tokenID, 'derivedEGLD'),
            value,
            oneSecond() * 12,
        );
    }

    async setDerivedUSD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            this.getTokenCacheKey(tokenID, 'derivedUSD'),
            value,
            oneSecond() * 12,
        );
    }

    private getTokenCacheKey(tokenID: string, ...args: any): string {
        return generateCacheKeyFromParams('token', tokenID, args);
    }
}
