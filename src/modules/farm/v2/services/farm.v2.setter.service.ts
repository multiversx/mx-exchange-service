import { EnergyType } from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { IWeeklyRewardsSplittingSetterService } from 'src/submodules/weekly-rewards-splitting/interfaces';
import { ClaimProgress } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { Logger } from 'winston';
import { FarmSetterService } from '../../base-module/services/farm.setter.service';

@Injectable()
export class FarmSetterServiceV2
    extends FarmSetterService
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
            this.getFarmCacheKey(
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
            this.getFarmCacheKey(
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
            this.getFarmCacheKey(
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
            this.getFarmCacheKey(
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
            this.getFarmCacheKey(scAddress, 'lastGlobalUpdateWeek'),
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
            this.getFarmCacheKey(scAddress, 'totalRewardsForWeek', week),
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
            this.getFarmCacheKey(scAddress, 'totalEnergyForWeek', week),
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
            this.getFarmCacheKey(scAddress, 'totalLockedTokensForWeek', week),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }
}
