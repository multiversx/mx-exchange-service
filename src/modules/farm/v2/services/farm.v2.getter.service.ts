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
import { TokenDistributionModel } from '../../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { EsdtTokenPayment } from '../../../../models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';

@Injectable()
export class FarmGetterServiceV2 extends FarmGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FarmAbiServiceV2,
        protected readonly computeService: FarmComputeServiceV2,
        protected readonly tokenGetter: TokenGetterService,
        protected readonly apiService: MXApiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
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

    async userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        energyAmount?: string,
        liquidity?: string,
    ): Promise<EsdtTokenPayment[]> {
        const [totalRewardsForWeek, userEnergyForWeek, totalEnergyForWeek] =
            await Promise.all([
                this.weeklyRewardsSplittingAbi.totalRewardsForWeek(
                    scAddress,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                    scAddress,
                    userAddress,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.totalEnergyForWeek(
                    scAddress,
                    week,
                ),
            ]);

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
}
