import { Inject, Injectable } from '@nestjs/common';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { GenericSetterService } from '../../../services/generics/generic.setter.service';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { IWeeklyRewardsSplittingSetterService } from 'src/submodules/weekly-rewards-splitting/interfaces';
import { EnergyType } from '@multiversx/sdk-exchange';
import { ClaimProgress } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';

@Injectable()
export class FeesCollectorSetterService
    extends GenericSetterService
    implements IWeeklyRewardsSplittingSetterService
{
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'feesCollector';
    }

    async currentClaimProgress(
        scAddress: string,
        userAddress: string,
        value: ClaimProgress,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(scAddress, 'currentClaimProgress', userAddress),
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
            this.getCacheKey(scAddress, 'userEnergyForWeek', userAddress, week),
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
            this.getCacheKey(
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
            this.getCacheKey(scAddress, 'lastActiveWeekForUser', userAddress),
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
            this.getCacheKey(scAddress, 'lastGlobalUpdateWeek'),
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
            this.getCacheKey(scAddress, 'totalRewardsForWeek', week),
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
            this.getCacheKey(scAddress, 'totalEnergyForWeek', week),
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
            this.getCacheKey(scAddress, 'totalLockedTokensForWeek', week),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setAccumulatedFees(
        scAddress: string,
        week: number,
        token: string,
        value: string,
    ): Promise<string> {
        return this.setData(
            this.getCacheKey(scAddress, 'accumulatedFees', week, token),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setAccumulatedLockedFees(
        scAddress: string,
        week: number,
        token: string,
        value: EsdtTokenPayment[],
    ): Promise<string> {
        return this.setData(
            this.getCacheKey(scAddress, 'accumulatedLockedFees', week, token),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }
}
