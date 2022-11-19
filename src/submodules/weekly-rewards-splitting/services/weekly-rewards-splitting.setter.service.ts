import { Inject, Injectable } from '@nestjs/common';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { oneMinute } from '../../../helpers/helpers';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import {
    GenericSetterService
} from "../../../services/generics/generic.setter.service";
import { EsdtTokenPayment } from "../../../models/esdtTokenPayment.model";
import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { ClaimProgress } from "../models/weekly-rewards-splitting.model";

@Injectable()
export class WeeklyRewardsSplittingSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async currentClaimProgress(scAddress: string, userAddress: string, value: ClaimProgress): Promise<string> {
        return this.setData(
            this.getWeeklyRewardsCacheKey(scAddress, 'currentClaimProgress', userAddress),
            value,
            oneMinute(),
        )
    }

    async userEnergyForWeek(scAddress: string, userAddress: string, week: number, value: EnergyType): Promise<string> {
        return this.setData(
            this.getWeeklyRewardsCacheKey(scAddress, 'userEnergyForWeek', userAddress, week),
            value,
            oneMinute(),
        )
    }

    async userRewardsForWeek(scAddress: string, userAddress: string, week: number, value: EsdtTokenPayment[]): Promise<string> {
        return this.setData(
            this.getWeeklyRewardsCacheKey(scAddress, 'userRewardsForWeek', userAddress, week),
            value,
            oneMinute(),
        )
    }

    async lastActiveWeekForUser(scAddress: string, userAddress: string, value: number): Promise<string> {
        return this.setData(
            this.getWeeklyRewardsCacheKey(scAddress, 'lastActiveWeekForUser', userAddress),
            value,
            oneMinute(),
        )
    }

    async lastGlobalUpdateWeek(scAddress: string, value: number): Promise<string> {
        return this.setData(
            this.getWeeklyRewardsCacheKey(scAddress, 'lastGlobalUpdateWeek'),
            value,
            oneMinute(),
        )
    }

    async totalRewardsForWeek(scAddress: string, week: number, value: EsdtTokenPayment[]): Promise<string> {
        return this.setData(
            this.getWeeklyRewardsCacheKey(scAddress, 'totalRewardsForWeek', week),
            value,
            oneMinute(),
        );
    }

    async totalEnergyForWeek(scAddress: string, week: number, value: string): Promise<string> {
        return this.setData(
            this.getWeeklyRewardsCacheKey(scAddress, 'totalEnergyForWeek', week),
            value,
            oneMinute(),
        );
    }

    async totalLockedTokensForWeek(scAddress: string, week: number, value: string): Promise<string> {
        return this.setData(
            this.getWeeklyRewardsCacheKey(scAddress, 'totalLockedTokensForWeek', week),
            value,
            oneMinute(),
        );
    }

    private getWeeklyRewardsCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams('weeklyRewards', address, ...args);
    }
}
