import { Inject, Injectable } from "@nestjs/common";
import { GenericGetterService } from "../../../services/generics/generic.getter.service";
import { CachingService } from "../../../services/caching/cache.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { oneHour, oneMinute } from "../../../helpers/helpers";
import { generateCacheKeyFromParams } from "../../../utils/generate-cache-key";
import { WeeklyRewardsSplittingAbiService } from "./weekly-rewards-splitting.abi.service";
import { ClaimProgress } from "./progress/progress.compute.service";
import { EnergyModel } from "../../../modules/simple-lock/models/simple.lock.model";

@Injectable()
export class WeeklyRewardsSplittingGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly weeklyRewardsAbiService: WeeklyRewardsSplittingAbiService,
    ) {
        super(cachingService, logger);
    }

    async currentClaimProgress(scAddress: string, userAddress: string, type: string): Promise<ClaimProgress> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress,'currentClaimProgress', userAddress),
            () => this.weeklyRewardsAbiService.currentClaimProgress(scAddress, userAddress, type),
            oneMinute(),
        )
    }

    async userEnergyForWeek(scAddress: string, userAddress: string, week: number, type: string): Promise<EnergyModel> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress,'userEnergyForWeek', userAddress, week),
            () => this.weeklyRewardsAbiService.userEnergyForWeek(scAddress, userAddress, week, type),
            oneMinute(),
        )
    }

    async lastActiveWeekForUser(scAddress: string, userAddress: string, type: string): Promise<number> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress,'lastActiveWeekForUser', userAddress),
            () => this.weeklyRewardsAbiService.lastActiveWeekForUser(scAddress, userAddress, type),
            oneMinute(),
        )
    }

    async lastGlobalUpdateWeek(scAddress: string, type: string): Promise<number> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress,'lastGlobalUpdateWeek'),
            () => this.weeklyRewardsAbiService.lastGlobalUpdateWeek(scAddress, type),
            oneHour(),
        )
    }

    async totalRewardsForWeek(scAddress: string, week: number, type: string): Promise<string> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress,'totalRewardsForWeek', week),
            () => this.weeklyRewardsAbiService.totalRewardsForWeek(scAddress, week, type),
            oneHour(),
        );
    }

    async totalEnergyForWeek(scAddress: string, week: number, type: string): Promise<string> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress,'totalEnergyForWeek', week),
            () => this.weeklyRewardsAbiService.totalEnergyForWeek(scAddress, week, type),
            oneHour(),
        );
    }

    async totalLockedTokensForWeek(scAddress: string, week: number, type: string): Promise<string> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress,'totalLockedTokensForWeek', week),
            () => this.weeklyRewardsAbiService.totalLockedTokensForWeek(scAddress, week, type),
            oneHour(),
        );
    }

    private getWeeklyRewardsCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams('weeklyRewards', address, ...args);
    }
}
