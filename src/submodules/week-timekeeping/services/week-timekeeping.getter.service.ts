import { GenericGetterService } from "../../../services/generics/generic.getter.service";
import { CachingService } from "../../../services/caching/cache.service";
import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { WeekTimekeepingAbiService } from "./week-timekeeping.abi.service";
import { generateCacheKeyFromParams } from "../../../utils/generate-cache-key";
import { oneMinute } from "../../../helpers/helpers";

export abstract class WeekTimekeepingGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly weekTimekeepingAbiService: WeekTimekeepingAbiService,
    ) {
        super(cachingService, logger);
    }

    async getCurrentWeek(scAddress: string): Promise<number> {
        return this.getData(
            this.getWeekTimekeepingCacheKey(scAddress,'currentWeek'),
            () => this.weekTimekeepingAbiService.getCurrentWeek(scAddress),
            oneMinute(),
        )
    }

    async getFirstWeekStartEpoch(scAddress: string): Promise<number> {
        return this.getData(
            this.getWeekTimekeepingCacheKey(scAddress, 'firstWeekStartEpoc'),
            () => this.weekTimekeepingAbiService.firstWeekStartEpoch(scAddress),
            oneMinute(),
        )
    }

    private getWeekTimekeepingCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams('weekTimekeeping', address, ...args);
    }
}
