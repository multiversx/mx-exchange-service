import { Injectable, Scope } from '@nestjs/common';
import { FarmComputeLoader } from '../../base-module/services/farm.compute.loader';
import { FarmComputeServiceV2 } from './farm.v2.compute.service';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmComputeLoaderV2 extends FarmComputeLoader {
    constructor(
        protected readonly farmCompute: FarmComputeServiceV2,
        protected readonly cacheService: CacheService,
    ) {
        super(farmCompute, cacheService);
    }
}
