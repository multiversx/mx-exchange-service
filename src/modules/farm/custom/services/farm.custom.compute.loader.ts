import { Injectable, Scope } from '@nestjs/common';
import { FarmComputeLoader } from '../../base-module/services/farm.compute.loader';
import { FarmCustomComputeService } from './farm.custom.compute.service';
import { CacheService } from '@multiversx/sdk-nestjs-cache';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmCustomComputeLoader extends FarmComputeLoader {
    constructor(
        protected readonly farmCompute: FarmCustomComputeService,
        protected readonly cacheService: CacheService,
    ) {
        super(farmCompute, cacheService);
    }
}
