import { Inject, Injectable } from "@nestjs/common";
import { GenericGetterService } from "../../../services/generics/generic.getter.service";
import { CachingService } from "../../../services/caching/cache.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { oneHour, oneMinute } from "../../../helpers/helpers";
import { generateCacheKeyFromParams } from "../../../utils/generate-cache-key";
import { WeeklyRewardsSplittingAbiService } from "./weekly-rewards-splitting.abi.service";

@Injectable()
export abstract class WeeklyRewardsSplittingGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly weeklyRewardsAbiService: WeeklyRewardsSplittingAbiService,
    ) {
        super(cachingService, logger);
    }

    abstract address: string;

    async userEnergyForWeek(user: string, week: number): Promise<number> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(this.address,'userEnergyForWeek', user, week),
            () => this.weeklyRewardsAbiService.userEnergyForWeek(this.address, user, week),
            oneMinute(),
        )
    }

    async lastActiveWeekForUser(user: string, week: number): Promise<number> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(this.address,'lastActiveWeekForUser', user, week),
            () => this.weeklyRewardsAbiService.lastActiveWeekForUser(this.address, user),
            oneMinute(),
        )
    }

    async lastGlobalUpdateWeek(): Promise<number> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(this.address,'lastGlobalUpdateWeek'),
            () => this.weeklyRewardsAbiService.lastGlobalUpdateWeek(this.address),
            oneHour(),
        )
    }

    async totalRewardsForWeek(week: number): Promise<string> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(this.address,'totalRewardsForWeek', week),
            () => this.weeklyRewardsAbiService.totalRewardsForWeek(this.address, week),
            oneHour(),
        );
    }

    async totalEnergyForWeek(week: number): Promise<string> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(this.address,'totalEnergyForWeek', week),
            () => this.weeklyRewardsAbiService.totalEnergyForWeek(this.address, week),
            oneHour(),
        );
    }

    async totalLockedTokensForWeek(week: number): Promise<string> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(this.address,'totalLockedTokensForWeek', week),
            () => this.weeklyRewardsAbiService.totalLockedTokensForWeek(this.address, week),
            oneHour(),
        );
    }

    private getWeeklyRewardsCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams('weeklyRewards', address, ...args);
    }
}
