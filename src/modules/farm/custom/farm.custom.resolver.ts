import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmCustomModel } from '../models/farm.custom.model';
import { FarmCustomAbiService } from './services/farm.custom.abi.service';
import { FarmCustomComputeService } from './services/farm.custom.compute.service';
import { FarmCustomService } from './services/farm.custom.service';

@Resolver(() => FarmCustomModel)
export class FarmCustomResolver extends FarmResolver {
    constructor(
        protected readonly farmAbi: FarmCustomAbiService,
        protected readonly farmService: FarmCustomService,
        protected readonly farmCompute: FarmCustomComputeService,
    ) {
        super(farmAbi, farmService, farmCompute);
    }

    @ResolveField()
    async requireWhitelist(
        @Parent() parent: FarmCustomModel,
    ): Promise<boolean> {
        const whitelists = await this.farmAbi.whitelist(parent.address);
        return whitelists ? whitelists.length > 0 : false;
    }
}
