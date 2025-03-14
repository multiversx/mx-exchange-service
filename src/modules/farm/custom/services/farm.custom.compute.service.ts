import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { FarmComputeService } from '../../base-module/services/farm.compute.service';
import { FarmCustomAbiService } from './farm.custom.abi.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { FarmCustomService } from './farm.custom.service';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable()
export class FarmCustomComputeService extends FarmComputeService {
    constructor(
        protected readonly farmAbi: FarmCustomAbiService,
        @Inject(forwardRef(() => FarmCustomService))
        protected readonly farmService: FarmCustomService,
        protected readonly pairService: PairService,
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
        protected readonly cacheService: CacheService,
    ) {
        super(
            farmAbi,
            farmService,
            pairService,
            pairCompute,
            contextGetter,
            tokenCompute,
            cacheService,
        );
    }
}
