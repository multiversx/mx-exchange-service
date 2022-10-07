import { GenericGetterService } from "../../../services/generics/generic.getter.service";
import { CachingService } from "../../../services/caching/cache.service";
import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { WeekTimekeepingAbiService } from "./week-timekeeping.abi.service";
import { generateCacheKeyFromParams } from "../../../utils/generate-cache-key";
import { oneMinute } from "../../../helpers/helpers";
import { WeekTimekeepingComputeService } from "./week-timekeeping.compute.service";

export abstract class WeekTimekeepingGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly weekTimekeepingAbiService: WeekTimekeepingAbiService,
        private readonly weekTimekeepingComputeService: WeekTimekeepingComputeService,
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

    async getStartEpochForWeek(scAddress: string, week: number): Promise<number> {
        return this.getData(
            this.getWeekTimekeepingCacheKey(scAddress, 'firstWeekStartEpoc'),
            () => this.weekTimekeepingComputeService.computeStartEpochForWeek(scAddress, week),
            oneMinute(),
        )
    }

    async getEndEpochForWeek(scAddress: string, week: number): Promise<number> {
        return this.getData(
            this.getWeekTimekeepingCacheKey(scAddress, 'firstWeekStartEpoc'),
            () => this.weekTimekeepingComputeService.computeEndEpochForWeek(scAddress, week),
            oneMinute(),
        )
    }

    private getWeekTimekeepingCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams('weekTimekeeping', address, ...args);
    }
}
