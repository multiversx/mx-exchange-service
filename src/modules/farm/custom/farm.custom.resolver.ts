import { ResolveField, Resolver } from '@nestjs/graphql';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmCustomModel } from '../models/farm.custom.model';
import { FarmCustomAbiService } from './services/farm.custom.abi.service';
import { FarmCustomComputeService } from './services/farm.custom.compute.service';
import { FarmCustomService } from './services/farm.custom.service';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FarmCustomAbiLoader } from './services/farm.custom.abi.loader';
import { FarmCustomComputeLoader } from './services/farm.custom.compute.loader';

@Resolver(() => FarmCustomModel)
export class FarmCustomResolver extends FarmResolver {
    constructor(
        protected readonly farmAbi: FarmCustomAbiService,
        protected readonly farmService: FarmCustomService,
        protected readonly farmCompute: FarmCustomComputeService,
        protected readonly farmAbiLoader: FarmCustomAbiLoader,
        protected readonly farmComputeLoader: FarmCustomComputeLoader,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(
            farmAbi,
            farmService,
            farmCompute,
            farmAbiLoader,
            farmComputeLoader,
            logger,
        );
    }

    @ResolveField()
    async requireWhitelist(parent: FarmCustomModel): Promise<boolean> {
        const whitelists = await this.farmAbi.whitelist(parent.address);
        return whitelists ? whitelists.length > 0 : false;
    }
}
