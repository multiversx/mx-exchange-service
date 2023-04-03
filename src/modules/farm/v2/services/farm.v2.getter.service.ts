import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { Logger } from 'winston';
import { FarmGetterService } from '../../base-module/services/farm.getter.service';
import { BoostedYieldsFactors } from '../../models/farm.v2.model';
import { FarmAbiServiceV2 } from './farm.v2.abi.service';
import { FarmComputeServiceV2 } from './farm.v2.compute.service';
import { IWeeklyRewardsSplittingGetterService } from '../../../../submodules/weekly-rewards-splitting/interfaces';
import { ClaimProgress } from '../../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { EnergyType } from '@multiversx/sdk-exchange';
import { EsdtTokenPayment } from '../../../../models/esdtTokenPayment.model';
import { IWeekTimekeepingGetterService } from 'src/submodules/week-timekeeping/interfaces';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';

@Injectable()
export class FarmGetterServiceV2
    extends FarmGetterService
    implements
        IWeeklyRewardsSplittingGetterService,
        IWeekTimekeepingGetterService
{
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FarmAbiServiceV2,
        protected readonly computeService: FarmComputeServiceV2,
        protected readonly tokenGetter: TokenGetterService,
        protected readonly apiService: MXApiService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {
        super(
            cachingService,
            logger,
            abiService,
            computeService,
            tokenGetter,
            apiService,
        );
    }

    async getCurrentWeek(scAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(scAddress, 'currentWeek'),
            () => this.weekTimekeepingAbi.getCurrentWeek(scAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getFirstWeekStartEpoch(scAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(scAddress, 'firstWeekStartEpoch'),
            () => this.weekTimekeepingAbi.firstWeekStartEpoch(scAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getStartEpochForWeek(
        scAddress: string,
        week: number,
    ): Promise<number> {
        const firstWeekStartEpoch = await this.getFirstWeekStartEpoch(
            scAddress,
        );
        return await this.getData(
            this.getCacheKey(scAddress, week, 'startEpochForWeek'),
            () =>
                this.weekTimekeepingCompute.computeStartEpochForWeek(
                    week,
                    firstWeekStartEpoch,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getEndEpochForWeek(scAddress: string, week: number): Promise<number> {
        const firstWeekStartEpoch = await this.getFirstWeekStartEpoch(
            scAddress,
        );
        return await this.getData(
            this.getCacheKey(scAddress, week, 'endEpochForWeek'),
            () =>
                this.weekTimekeepingCompute.computeEndEpochForWeek(
                    week,
                    firstWeekStartEpoch,
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
                this.computeService.computeUserApr(
                    totalLockedTokensForWeek,
                    totalRewardsForWeek,
                    totalEnergyForWeek,
                    userEnergyForWeek,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getAccumulatedRewardsForWeek(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'accumulatedRewardsForWeek', week),
            () => this.abiService.accumulatedRewardsForWeek(scAddress, week),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getUserAccumulatedRewardsForWeek(
        scAddress: string,
        week: number,
        userAddress: string,
        liquidity: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(
                scAddress,
                'userAccumulatedRewardsForWeek',
                week,
                userAddress,
            ),
            () =>
                this.computeService.computeUserAccumulatedRewards(
                    scAddress,
                    week,
                    userAddress,
                    liquidity,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getOptimalEnergyPerLp(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'optimalRatio', week),
            () =>
                this.computeService.computeOptimalEnergyPerLP(scAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getBoostedYieldsRewardsPercenatage(
        farmAddress: string,
    ): Promise<number> {
        return await this.getData(
            this.getCacheKey(farmAddress, 'boostedYieldsRewardsPercenatage'),
            () =>
                this.abiService.getBoostedYieldsRewardsPercenatage(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getBoostedYieldsFactors(
        farmAddress: string,
    ): Promise<BoostedYieldsFactors> {
        return await this.getData(
            this.getCacheKey(farmAddress, 'boostedYieldsFactors'),
            () => this.abiService.getBoostedYieldsFactors(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getLockingScAddress(farmAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddress, 'lockingScAddress'),
            () => this.abiService.getLockingScAddress(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getLockEpochs(farmAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(farmAddress, 'lockEpochs'),
            () => this.abiService.getLockEpochs(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getRemainingBoostedRewardsToDistribute(
        farmAddress: string,
        week: number,
    ): Promise<string> {
        return await this.getData(
            this.getCacheKey(
                farmAddress,
                week,
                'remainingBoostedRewardsToDistribute',
            ),
            () =>
                this.abiService.getRemainingBoostedRewardsToDistribute(
                    farmAddress,
                    week,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getUndistributedBoostedRewards(farmAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddress, 'undistributedBoostedRewards'),
            () => this.abiService.getUndistributedBoostedRewards(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getEnergyFactoryAddress(farmAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddress, 'energyFactoryAddress'),
            () => this.abiService.getEnergyFactoryAddress(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
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
        const endEpochForWeek = await this.getEndEpochForWeek(scAddress, week);
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
                this.computeService.computeUserRewardsForWeek(
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
            () => this.computeService.computeDistribution(userRewardsForWeek),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalRewardsDistributionForWeek(scAddress: string, week: number) {
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
            () => this.computeService.computeDistribution(totalRewardsForWeek),
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
}
