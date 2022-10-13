import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { CommunityDistributionModel } from '../models/distribution.model';
import { AbiDistributionService } from './abi-distribution.service';

@Injectable()
export class DistributionGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiDistributionService,
    ) {
        super(cachingService, logger, 'distribution');
    }

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        return await this.getData(
            this.getCacheKey('communityDistribution'),
            () => this.abiService.getCommunityDistribution(),
            oneMinute() * 5,
        );
    }
}
