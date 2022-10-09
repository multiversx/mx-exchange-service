import { Inject, Injectable } from "@nestjs/common";
import { GenericGetterService } from "../../../services/generics/generic.getter.service";
import { CachingService } from "../../../services/caching/cache.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { FeesCollectorAbiService } from "./fees-collector.abi.service";
import { generateCacheKeyFromParams } from "../../../utils/generate-cache-key";
import { oneMinute } from "../../../helpers/helpers";

@Injectable()
export class FeesCollectorGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: FeesCollectorAbiService,
    ) {
        super(cachingService, logger);
    }

    async getAccumulatedFees(scAddress: string, week: number, token: string): Promise<number> {
        return this.getData(
            this.getFeesCollectorCacheKey(scAddress,'accumulatedFees', week, token),
            () => this.abiService.accumulatedFees(scAddress, week, token),
            oneMinute(),
        )
    }

    private getFeesCollectorCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams(address, ...args);
    }


}
