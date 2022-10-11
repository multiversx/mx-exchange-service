import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';

@Injectable()
export class GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    protected async getData(
        cacheKey: string,
        createValueFunc: () => any,
        remoteTtl: number,
        localTtl?: number,
    ): Promise<any> {
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                remoteTtl,
                localTtl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                this.constructor.name,
                createValueFunc.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
    //TODO SERVICES-731: add getCacheKey
}
