import { Controller, Inject } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { Logger } from 'winston';

@Controller()
export class CacheController {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly cachingService: CacheService,
    ) {}

    @EventPattern('deleteCacheKeys')
    async deleteCacheKey(keys: string[]) {
        for (const key of keys) {
            await this.cachingService.deleteLocal(key);
        }
    }
}
