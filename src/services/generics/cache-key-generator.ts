import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { Logger } from 'winston';

export class CacheKeyGenerator {
    protected baseKey: string|undefined
    constructor(
        protected readonly logger: Logger
    ) {
    }

    protected getCacheKey(...args: any) {
        if (!this.baseKey) {
            this.logger.error('baseKey was not set')
        }
        return generateCacheKeyFromParams(this.baseKey, ...args);
    }
}