import { Injectable, Scope } from '@nestjs/common';
import { FarmAbiLoader } from '../../base-module/services/farm.abi.loader';
import { FarmServiceV2 } from './farm.v2.service';
import { FarmAbiServiceV2 } from './farm.v2.abi.service';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmAbiLoaderV2 extends FarmAbiLoader {
    constructor(
        protected readonly farmAbi: FarmAbiServiceV2,
        protected readonly farmService: FarmServiceV2,
        protected readonly cacheService: CacheService,
    ) {
        super(farmAbi, farmService, cacheService);
    }
}
