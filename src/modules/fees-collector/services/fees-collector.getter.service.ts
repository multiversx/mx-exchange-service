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
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';

@Injectable()
export class FeesCollectorGetterService
    extends GenericGetterService
    implements IFeesCollectorGetterService
{
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FeesCollectorAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        @Inject(forwardRef(() => FeesCollectorComputeService))
        private readonly computeService: FeesCollectorComputeService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'feesCollector';
    }

    async userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        energyAmount?: string,
    ): Promise<EsdtTokenPayment[]> {
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
                    userAddress,
                    week,
                    energyAmount,
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
        const totalRewardsForWeek =
            await this.weeklyRewardsSplittingAbi.totalRewardsForWeek(
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

    async getUserApr(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<string> {
        const [
            totalLockedTokensForWeek,
            totalRewardsForWeek,
            totalEnergyForWeek,
            userEnergyForWeek,
        ] = await Promise.all([
            this.weeklyRewardsSplittingAbi.totalLockedTokensForWeek(
                scAddress,
                week,
            ),
            this.weeklyRewardsSplittingAbi.totalRewardsForWeek(scAddress, week),
            this.weeklyRewardsSplittingAbi.totalEnergyForWeek(scAddress, week),
            this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                scAddress,
                userAddress,
                week,
            ),
        ]);

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
