import { Injectable, Scope } from '@nestjs/common';
import { FarmComputeLoader } from '../../base-module/services/farm.compute.loader';
import { FarmComputeServiceV2 } from './farm.v2.compute.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmComputeLoaderV2 extends FarmComputeLoader {
    constructor(protected readonly farmCompute: FarmComputeServiceV2) {
        super(farmCompute);
    }
}
