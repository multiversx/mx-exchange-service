import { Injectable, Scope } from '@nestjs/common';
import { FarmAbiLoader } from '../../base-module/services/farm.abi.loader';
import { FarmCustomService } from './farm.custom.service';
import { FarmCustomAbiService } from './farm.custom.abi.service';
import { CacheService } from '@multiversx/sdk-nestjs-cache';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmCustomAbiLoader extends FarmAbiLoader {
    constructor(
        protected readonly farmAbi: FarmCustomAbiService,
        protected readonly farmService: FarmCustomService,
        protected readonly cacheService: CacheService,
    ) {
        super(farmAbi, farmService, cacheService);
    }
}
