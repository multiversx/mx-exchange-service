import { Injectable, Scope } from '@nestjs/common';
import { FarmComputeLoader } from '../../base-module/services/farm.compute.loader';
import { FarmCustomComputeService } from './farm.custom.compute.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmCustomComputeLoader extends FarmComputeLoader {
    constructor(protected readonly farmCompute: FarmCustomComputeService) {
        super(farmCompute);
    }
}
