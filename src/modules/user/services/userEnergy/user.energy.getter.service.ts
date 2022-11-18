import { Inject, Injectable } from "@nestjs/common";
import { GenericGetterService } from "../../../../services/generics/generic.getter.service";
import { oneMinute } from "../../../../helpers/helpers";
import { UserEnergyComputeService } from "./user.energy.compute.service";
import { CachingService } from "../../../../services/caching/cache.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { OutdatedContract } from "../../models/user.model";

@Injectable()
export class UserEnergyGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly userEnergyCompute: UserEnergyComputeService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'userOutdatedContracts'
    }

    async getUserOutdatedContracts(userAddress: string): Promise<OutdatedContract[]> {
        return this.getData(
            this.getCacheKey(userAddress),
            () => this.userEnergyCompute.computeUserOutdatedContracts(userAddress),
            oneMinute(),
        )
    }
}