import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { generateSetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';

@Injectable()
export class GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    protected async setData(
        cacheKey: string,
        value: any,
        ttl: number,
    ): Promise<string> {
        try {
            await this.cachingService.setCache(cacheKey, value, ttl);
            return cacheKey;
        } catch (error) {
            const logMessage = generateSetLogMessage(
                this.constructor.name,
                this.setData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
