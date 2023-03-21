import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';
import { GenericSetterService } from '../generics/generic.setter.service';

@Injectable()
export class CMCApiSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);

        this.baseKey = 'cmc';
    }

    async setUSDCPrice(value: number): Promise<string> {
        return await this.setData(
            this.getCacheKey('price', 'usdc'),
            value,
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }
}
