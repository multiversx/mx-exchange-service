import { Inject, Injectable } from '@nestjs/common';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { GenericSetterService } from '../../../services/generics/generic.setter.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { EnergyType } from '@multiversx/sdk-exchange';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { IWeeklyRewardsSplittingSetterService } from '../interfaces';

@Injectable()
export class WeeklyRewardsSplittingSetterService
    extends GenericSetterService
    implements IWeeklyRewardsSplittingSetterService
{
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async currentClaimProgress(
        scAddress: string,
        userAddress: string,
        value: ClaimProgress,
    ): Promise<string> {
        return await this.setData(
            this.getWeeklyRewardsCacheKey(
                scAddress,
                'currentClaimProgress',
                userAddress,
            ),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async userEnergyForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        value: EnergyType,
    ): Promise<string> {
        return await this.setData(
            this.getWeeklyRewardsCacheKey(
                scAddress,
                'userEnergyForWeek',
                userAddress,
                week,
            ),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        value: EsdtTokenPayment[],
    ): Promise<string> {
        return await this.setData(
            this.getWeeklyRewardsCacheKey(
                scAddress,
                'userRewardsForWeek',
                userAddress,
                week,
            ),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async lastActiveWeekForUser(
        scAddress: string,
        userAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getWeeklyRewardsCacheKey(
                scAddress,
                'lastActiveWeekForUser',
                userAddress,
            ),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async lastGlobalUpdateWeek(
        scAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getWeeklyRewardsCacheKey(scAddress, 'lastGlobalUpdateWeek'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalRewardsForWeek(
        scAddress: string,
        week: number,
        value: EsdtTokenPayment[],
    ): Promise<string> {
        return await this.setData(
            this.getWeeklyRewardsCacheKey(
                scAddress,
                'totalRewardsForWeek',
                week,
            ),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalEnergyForWeek(
        scAddress: string,
        week: number,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getWeeklyRewardsCacheKey(
                scAddress,
                'totalEnergyForWeek',
                week,
            ),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalLockedTokensForWeek(
        scAddress: string,
        week: number,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getWeeklyRewardsCacheKey(
                scAddress,
                'totalLockedTokensForWeek',
                week,
            ),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    private getWeeklyRewardsCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams('weeklyRewards', address, ...args);
    }
}
