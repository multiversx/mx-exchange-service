import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { FarmServiceBase } from '../../base-module/services/farm.base.service';
import { RewardsModel } from '../../models/farm.model';
import { FarmTokenAttributesModel } from '../../models/farmTokenAttributes.model';
import { FarmCustomAbiService } from './farm.custom.abi.service';
import { FarmCustomComputeService } from './farm.custom.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';

@Injectable()
export class FarmCustomService extends FarmServiceBase {
    constructor(
        protected readonly farmAbi: FarmCustomAbiService,
        @Inject(forwardRef(() => FarmCustomComputeService))
        protected readonly farmCompute: FarmCustomComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly cachingService: CachingService,
        protected readonly tokenGetter: TokenGetterService,
    ) {
        super(farmAbi, farmCompute, contextGetter, cachingService, tokenGetter);
    }

    getRewardsForPosition(): Promise<RewardsModel> {
        throw new Error('Method not implemented.');
    }
    decodeFarmTokenAttributes(): FarmTokenAttributesModel {
        throw new Error('Method not implemented.');
    }
}
