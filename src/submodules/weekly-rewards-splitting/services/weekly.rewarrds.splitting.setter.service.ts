import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CacheService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';
import { IWeeklyRewardsSplittingSetterService } from '../interfaces';
import { EnergyType } from '@multiversx/sdk-exchange';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class WeeklyRewardsSplittingSetterService
    extends GenericSetterService
    implements IWeeklyRewardsSplittingSetterService
{
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);

        this.baseKey = 'weeklyRewards';
    }

    async currentClaimProgress(
        scAddress: string,
        userAddress: string,
        value: ClaimProgress,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('currentClaimProgress', scAddress, userAddress),
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
            this.getCacheKey('userEnergyForWeek', scAddress, userAddress, week),
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
            this.getCacheKey('lastActiveWeekForUser', scAddress, userAddress),
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
            this.getCacheKey('lastGlobalUpdateWeek', scAddress),
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
            this.getCacheKey('totalRewardsForWeek', scAddress, week),
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
            this.getCacheKey('totalEnergyForWeek', scAddress, week),
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
            this.getCacheKey('totalLockedTokensForWeek', scAddress, week),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async weekAPR(
        scAddress: string,
        week: number,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('weekAPR', scAddress, week),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }
}
