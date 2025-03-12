import { Injectable, Scope } from '@nestjs/common';
import { FarmAbiLoader } from '../../base-module/services/farm.abi.loader';
import { FarmServiceV1_3 } from './farm.v1.3.service';
import { FarmAbiServiceV1_3 } from './farm.v1.3.abi.service';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmAbiLoaderV1_3 extends FarmAbiLoader {
    constructor(
        protected readonly farmAbi: FarmAbiServiceV1_3,
        protected readonly farmService: FarmServiceV1_3,
        protected readonly cacheService: CacheService,
    ) {
        super(farmAbi, farmService, cacheService);
    }
}
