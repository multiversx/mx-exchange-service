import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { Logger } from 'winston';
import { FarmServiceBase } from '../../base-module/services/farm.base.service';
import { FarmAbiServiceV2 } from './farm.v2.abi.service';
import { FarmGetterServiceV2 } from './farm.v2.getter.service';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { RewardsModel } from '../../models/farm.model';
import { FarmTokenAttributesModelV1_3 } from '../../models/farmTokenAttributes.model';
import { FarmComputeServiceV2 } from './farm.v2.compute.service';

@Injectable()
export class FarmServiceV2 extends FarmServiceBase {
    constructor(
        protected readonly abiService: FarmAbiServiceV2,
        @Inject(forwardRef(() => FarmGetterServiceV2))
        protected readonly farmGetter: FarmGetterServiceV2,
        protected readonly farmCompute: FarmComputeServiceV2,
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

    getRewardsForPosition(
        positon: CalculateRewardsArgs,
    ): Promise<RewardsModel> {
        throw new Error('Method not implemented.');
    }
    decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModelV1_3 {
        throw new Error('Method not implemented.');
    }
}
