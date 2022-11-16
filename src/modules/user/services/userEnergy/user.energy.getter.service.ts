import { Inject, Injectable } from "@nestjs/common";
import { GenericGetterService } from "../../../../services/generics/generic.getter.service";
import { oneMinute } from "../../../../helpers/helpers";
import { UserEnergyComputeService } from "./user.energy.compute.service";
import { CachingService } from "../../../../services/caching/cache.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class UserEnergyGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly userEnergyCompute: UserEnergyComputeService,
    ) {
        super(cachingService, logger);
    }

    async getUserEnergyOutdatedAddresses(userAddress: string): Promise<string[]> {
        return this.getData(
            this.getCacheKey('userEnergyOutdatedAddresses', userAddress),
            () => this.userEnergyCompute.computeUserEnergyOutdatedAddresses(userAddress),
            oneMinute(),
        )
    }
}