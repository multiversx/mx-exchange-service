import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';
import { GenericGetterService } from '../generics/generic.getter.service';
import { CMCApiService } from './api.cmc.service';

@Injectable()
export class CMCApiGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly cmcApi: CMCApiService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'cmc';
    }

    async getUSDCPrice(): Promise<number> {
        return await this.getData(
            'price.usdc',
            () => this.cmcApi.getUSDCPrice(),
            oneMinute() * 4,
        );
    }
}
