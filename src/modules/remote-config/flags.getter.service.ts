import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';

@Injectable()
export class FlagsGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly flagRepositoryService: FlagRepositoryService,
    ) {
        super(cachingService, logger)
        this.baseKey = 'flag';
    }

    async getMaintenanceFlagValue(): Promise<boolean> {
        const cacheKey = this.getCacheKey('MAINTENANCE');
        return await this.getData(
            cacheKey,
            () =>
                this.flagRepositoryService
                    .findOne({
                        name: 'MAINTENANCE',
                    })
                    .then(res => {
                        return res.value;
                    }),
            oneHour(),
        );
    }

    async getMultiSwapStatus(): Promise<boolean> {
        const cacheKey = this.getCacheKey('MULTISWAP');
        return await this.getData(
            cacheKey,
            () =>
                this.flagRepositoryService
                    .findOne({
                        name: 'MULTISWAP',
                    })
                    .then(res => {
                        return res ? res.value : false;
                    }),
            oneHour(),
        );
    }
}
