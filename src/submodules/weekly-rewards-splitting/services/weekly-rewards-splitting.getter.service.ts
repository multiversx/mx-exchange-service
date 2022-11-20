import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { WeeklyRewardsSplittingAbiService } from './weekly-rewards-splitting.abi.service';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingComputeService } from './weekly-rewards-splitting.compute.service';
import { IWeeklyRewardsSplittingGetterService } from '../interfaces';
import { GenericGetterService } from '../../../services/generics/generic.getter.service';
import { EnergyType } from '@elrondnetwork/erdjs-dex/dist/attributes-decoder/energy/energy.type';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';

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
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        )
    }

    async userEnergyForWeek(scAddress: string, userAddress: string, week: number): Promise<EnergyType> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'userEnergyForWeek', userAddress, week),
            () => this.weeklyRewardsAbiService.userEnergyForWeek(scAddress, userAddress, week),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        )
    }

    async userRewardsForWeek(scAddress: string, userAddress: string, week: number): Promise<EsdtTokenPayment[]> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'userRewardsForWeek', userAddress, week),
            () => this.weeklyRewardsSplittingCompute.computeUserRewardsForWeek(scAddress, week, userAddress),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        )
    }

    async lastActiveWeekForUser(scAddress: string, userAddress: string): Promise<number> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'lastActiveWeekForUser', userAddress),
            () => this.weeklyRewardsAbiService.lastActiveWeekForUser(scAddress, userAddress),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        )
    }

    async lastGlobalUpdateWeek(scAddress: string): Promise<number> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'lastGlobalUpdateWeek'),
            () => this.weeklyRewardsAbiService.lastGlobalUpdateWeek(scAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        )
    }

    async totalRewardsForWeek(scAddress: string, week: number): Promise<EsdtTokenPayment[]> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'totalRewardsForWeek', week),
            () => this.weeklyRewardsAbiService.totalRewardsForWeek(scAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalEnergyForWeek(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'totalEnergyForWeek', week),
            () => this.weeklyRewardsAbiService.totalEnergyForWeek(scAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalLockedTokensForWeek(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getWeeklyRewardsCacheKey(scAddress, 'totalLockedTokensForWeek', week),
            () => this.weeklyRewardsAbiService.totalLockedTokensForWeek(scAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    private getWeeklyRewardsCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams('weeklyRewards', address, ...args);
    }
}
