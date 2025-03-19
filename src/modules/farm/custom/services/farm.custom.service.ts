import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { FarmServiceBase } from '../../base-module/services/farm.base.service';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { RewardsModel } from '../../models/farm.model';
import { FarmTokenAttributesModel } from '../../models/farmTokenAttributes.model';
import { FarmCustomAbiService } from './farm.custom.abi.service';
import { FarmCustomComputeService } from './farm.custom.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { CacheService } from 'src/services/caching/cache.service';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class FarmCustomService extends FarmServiceBase {
    constructor(
        protected readonly farmAbi: FarmCustomAbiService,
        @Inject(forwardRef(() => FarmCustomComputeService))
        protected readonly farmCompute: FarmCustomComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly cachingService: CacheService,
        protected readonly tokenService: TokenService,
    ) {
        super(
            farmAbi,
            farmCompute,
            contextGetter,
            cachingService,
            tokenService,
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
    ): FarmTokenAttributesModel {
        throw new Error('Method not implemented.');
    }
}
