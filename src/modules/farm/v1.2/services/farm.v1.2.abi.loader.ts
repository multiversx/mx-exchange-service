import { Injectable, Scope } from '@nestjs/common';
import { FarmAbiLoader } from '../../base-module/services/farm.abi.loader';
import { FarmServiceV1_2 } from './farm.v1.2.service';
import { FarmAbiServiceV1_2 } from './farm.v1.2.abi.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmAbiLoaderV1_2 extends FarmAbiLoader {
    constructor(
        protected readonly farmAbi: FarmAbiServiceV1_2,
        protected readonly farmService: FarmServiceV1_2,
    ) {
        super(farmAbi, farmService);
    }
}
