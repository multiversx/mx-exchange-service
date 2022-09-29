import { Inject, Injectable } from "@nestjs/common";
import { GenericGetterService } from "../../../services/generics/generic.getter.service";
import { CachingService } from "../../../services/caching/cache.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { FeesCollectorAbiService } from "./fees-collector.abi.service";
import { oneHour } from "../../../helpers/helpers";
import { generateCacheKeyFromParams } from "../../../utils/generate-cache-key";
import { scAddress } from "../../../config";
import {
    WeeklyRewardsSplittingGetterService
} from "../../../submodules/weekly-rewards-splitting/services/weekly-rewards.splitting.getter.service";
import { Mixin } from "ts-mixer";

@Injectable()
export class FeesCollectorGetterService extends Mixin(GenericGetterService, WeeklyRewardsSplittingGetterService) {
    address: string;

    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: FeesCollectorAbiService,
    ) {
        super(cachingService, logger);
    }

    private getCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams(address, ...args);
    }


}
