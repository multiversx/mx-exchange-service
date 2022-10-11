import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { Logger } from 'winston';
import { FarmComputeService } from '../../base-module/services/farm.compute.service';
import { FarmService } from '../../base-module/services/farm.service';
import { FarmV2AbiService } from './farm.v2.abi.service';
import { FarmV2GetterService } from './farm.v2.getter.service';

@Injectable()
export class FarmV2Service extends FarmService {
    constructor(
        protected readonly abiService: FarmV2AbiService,
        @Inject(forwardRef(() => FarmV2GetterService))
        protected readonly farmGetter: FarmV2GetterService,
        protected readonly farmCompute: FarmComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(
            abiService,
            farmGetter,
            farmCompute,
            contextGetter,
            cachingService,
            logger,
        );
    }
}
