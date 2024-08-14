import { Injectable, Scope } from '@nestjs/common';
import { FarmAbiLoader } from '../../base-module/services/farm.abi.loader';
import { FarmCustomService } from './farm.custom.service';
import { FarmCustomAbiService } from './farm.custom.abi.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmCustomAbiLoader extends FarmAbiLoader {
    constructor(
        protected readonly farmAbi: FarmCustomAbiService,
        protected readonly farmService: FarmCustomService,
    ) {
        super(farmAbi, farmService);
    }
}
