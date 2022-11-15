import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { oneMinute } from '../../../helpers/helpers';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { WeeklyRewardsSplittingAbiService } from './weekly-rewards-splitting.abi.service';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingComputeService } from './weekly-rewards-splitting.compute.service';
import { IWeeklyRewardsSplittingGetterService } from "../interfaces";
import { GenericGetterService } from "../../../services/generics/generic.getter.service";
import { EnergyType } from "@elrondnetwork/erdjs-dex/dist/attributes-decoder/energy/energy.type";

@Injectable()
export class WeeklyRewardsSplittingGetterService extends GenericGetterService implements IWeeklyRewardsSplittingGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly weeklyRewardsAbiService: WeeklyRewardsSplittingAbiService,
        @Inject(forwardRef(() => WeeklyRewardsSplittingComputeService))
        protected readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
    ) {
        super(cachingService, logger);
    }

    async currentClaimProgress(scAddress: string, userAddress: string): Promise<ClaimProgress> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'currentClaimProgress', userAddress),
            () => this.weeklyRewardsAbiService.currentClaimProgress(scAddress, userAddress),
            oneMinute(),
        )
    }

    async userEnergyForWeek(scAddress: string, userAddress: string, week: number): Promise<EnergyType> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'userEnergyForWeek', userAddress, week),
            () => this.weeklyRewardsAbiService.userEnergyForWeek(scAddress, userAddress, week),
            oneMinute(),
        )
    }

    async userRewardsForWeek(scAddress: string, userAddress: string, week: number): Promise<EsdtTokenPayment[]> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'userRewardsForWeek', userAddress, week),
            () => this.weeklyRewardsSplittingCompute.computeUserRewardsForWeek(scAddress, week, userAddress),
            oneMinute(),
        )
    }

    async lastActiveWeekForUser(scAddress: string, userAddress: string): Promise<number> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'lastActiveWeekForUser', userAddress),
            () => this.weeklyRewardsAbiService.lastActiveWeekForUser(scAddress, userAddress),
            oneMinute(),
        )
    }

    async lastGlobalUpdateWeek(scAddress: string): Promise<number> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'lastGlobalUpdateWeek'),
            () => this.weeklyRewardsAbiService.lastGlobalUpdateWeek(scAddress),
            oneMinute(),
        )
    }

    async totalRewardsForWeek(scAddress: string, week: number): Promise<EsdtTokenPayment[]> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'totalRewardsForWeek', week),
            () => this.weeklyRewardsAbiService.totalRewardsForWeek(scAddress, week),
            oneMinute(),
        );
    }

    async totalEnergyForWeek(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'totalEnergyForWeek', week),
            () => this.weeklyRewardsAbiService.totalEnergyForWeek(scAddress, week),
            oneMinute(),
        );
    }

    async totalLockedTokensForWeek(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'totalLockedTokensForWeek', week),
            () => this.weeklyRewardsAbiService.totalLockedTokensForWeek(scAddress, week),
            oneMinute(),
        );
    }

    private getWeeklyRewardsCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams('weeklyRewards', address, ...args);
    }
}
