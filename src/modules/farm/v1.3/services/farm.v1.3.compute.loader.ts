import { Injectable, Scope } from '@nestjs/common';
import { FarmComputeLoader } from '../../base-module/services/farm.compute.loader';
import { FarmComputeServiceV1_3 } from './farm.v1.3.compute.service';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmComputeLoaderV1_3 extends FarmComputeLoader {
    constructor(
        protected readonly farmCompute: FarmComputeServiceV1_3,
        protected readonly cacheService: CacheService,
    ) {
        super(farmCompute, cacheService);
    }
}
