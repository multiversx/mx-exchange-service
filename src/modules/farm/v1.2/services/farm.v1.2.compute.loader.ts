import { Injectable, Scope } from '@nestjs/common';
import { FarmComputeLoader } from '../../base-module/services/farm.compute.loader';
import { FarmComputeServiceV1_2 } from './farm.v1.2.compute.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmComputeLoaderV1_2 extends FarmComputeLoader {
    constructor(protected readonly farmCompute: FarmComputeServiceV1_2) {
        super(farmCompute);
    }
}
