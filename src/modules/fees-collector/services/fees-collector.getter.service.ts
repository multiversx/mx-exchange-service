import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { GenericGetterService } from '../../../services/generics/generic.getter.service';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FeesCollectorAbiService } from './fees-collector.abi.service';
import { IFeesCollectorGetterService } from '../interfaces';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { FeesCollectorComputeService } from './fees-collector.compute.service';
import { IWeeklyRewardsSplittingGetterService } from 'src/submodules/weekly-rewards-splitting/interfaces';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import {
    ClaimProgress,
    TokenDistributionModel,
} from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { EnergyType } from '@multiversx/sdk-exchange';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';

@Injectable()
export class FeesCollectorGetterService
    extends GenericGetterService
    implements
        IFeesCollectorGetterService,
        IWeeklyRewardsSplittingGetterService
{
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FeesCollectorAbiService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        @Inject(forwardRef(() => FeesCollectorComputeService))
        private readonly computeService: FeesCollectorComputeService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'feesCollector';
    }

    async currentClaimProgress(
        scAddress: string,
        userAddress: string,
    ): Promise<ClaimProgress> {
        return this.getData(
            this.getCacheKey(scAddress, 'currentClaimProgress', userAddress),
            () =>
                this.weeklyRewardsSplittingAbi.currentClaimProgress(
                    scAddress,
                    userAddress,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async userEnergyForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<EnergyType> {
        const endEpochForWeek =
            await this.weekTimekeepingCompute.endEpochForWeek(scAddress, week);
        return this.getData(
            this.getCacheKey(scAddress, 'userEnergyForWeek', userAddress, week),
            () =>
                this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                    scAddress,
                    userAddress,
                    week,
                    endEpochForWeek,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        energyAmount?: string,
        liquidity?: string,
    ): Promise<EsdtTokenPayment[]> {
        const totalRewardsForWeek = await this.totalRewardsForWeek(
            scAddress,
            week,
        );
        const userEnergyForWeek = await this.userEnergyForWeek(
            scAddress,
            userAddress,
            week,
        );
        const totalEnergyForWeek = await this.totalEnergyForWeek(
            scAddress,
            week,
        );
        return this.getData(
            this.getCacheKey(
                scAddress,
                'userRewardsForWeek',
                userAddress,
                week,
            ),
            () =>
                this.weeklyRewardsSplittingCompute.computeUserRewardsForWeek(
                    scAddress,
                    totalRewardsForWeek,
                    userEnergyForWeek,
                    totalEnergyForWeek,
                    energyAmount,
                    liquidity,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async userRewardsDistributionForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ) {
        const userRewardsForWeek = await this.userRewardsForWeek(
            scAddress,
            userAddress,
            week,
        );

        return this.getData(
            this.getCacheKey(
                scAddress,
                'userRewardsDistributionForWeek',
                userAddress,
                week,
            ),
            () =>
                this.weeklyRewardsSplittingCompute.computeDistribution(
                    userRewardsForWeek,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalRewardsDistributionForWeek(
        scAddress: string,
        week: number,
    ): Promise<TokenDistributionModel[]> {
        const totalRewardsForWeek = await this.totalRewardsForWeek(
            scAddress,
            week,
        );
        return this.getData(
            this.getCacheKey(
                scAddress,
                'totalRewardsDistributionForWeek',
                week,
            ),
            () =>
                this.weeklyRewardsSplittingCompute.computeDistribution(
                    totalRewardsForWeek,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async lastActiveWeekForUser(
        scAddress: string,
        userAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getCacheKey(scAddress, 'lastActiveWeekForUser', userAddress),
            () =>
                this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
                    scAddress,
                    userAddress,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async lastGlobalUpdateWeek(scAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(scAddress, 'lastGlobalUpdateWeek'),
            () =>
                this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeek(scAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalRewardsForWeek(
        scAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]> {
        return this.getData(
            this.getCacheKey(scAddress, 'totalRewardsForWeek', week),
            () =>
                this.weeklyRewardsSplittingAbi.totalRewardsForWeek(
                    scAddress,
                    week,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalEnergyForWeek(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'totalEnergyForWeek', week),
            () =>
                this.weeklyRewardsSplittingAbi.totalEnergyForWeek(
                    scAddress,
                    week,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalLockedTokensForWeek(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'totalLockedTokensForWeek', week),
            () =>
                this.weeklyRewardsSplittingAbi.totalLockedTokensForWeek(
                    scAddress,
                    week,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getUserApr(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<string> {
        const totalLockedTokensForWeek = await this.totalLockedTokensForWeek(
            scAddress,
            week,
        );
        const totalRewardsForWeek = await this.totalRewardsForWeek(
            scAddress,
            week,
        );
        const totalEnergyForWeek = await this.totalEnergyForWeek(
            scAddress,
            week,
        );
        const userEnergyForWeek = await this.userEnergyForWeek(
            scAddress,
            userAddress,
            week,
        );

        return this.getData(
            this.getCacheKey(scAddress, 'userApr', userAddress, week),
            () =>
                this.weeklyRewardsSplittingCompute.computeUserApr(
                    totalLockedTokensForWeek,
                    totalRewardsForWeek,
                    totalEnergyForWeek,
                    userEnergyForWeek,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getAccumulatedFees(
        scAddress: string,
        week: number,
        token: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'accumulatedFees', week, token),
            () => this.abiService.accumulatedFees(week, token),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    getAccumulatedTokenForInflation(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'accumulatedFeesForInflation', week),
            () =>
                this.computeService.computeAccumulatedFeesUntilNow(
                    scAddress,
                    week,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getLockedTokenId(scAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'lockedTokenId'),
            () => this.abiService.lockedTokenId(),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getLockedTokensPerBlock(scAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'lockedTokensPerBlock'),
            () => this.abiService.lockedTokensPerBlock(),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getAllTokens(scAddress: string): Promise<string[]> {
        return this.getData(
            this.getCacheKey(scAddress, 'allTokens'),
            () => this.abiService.allTokens(),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }
}
