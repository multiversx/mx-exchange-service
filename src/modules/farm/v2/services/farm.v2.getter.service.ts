import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { Logger } from 'winston';
import { FarmGetterService } from '../../base-module/services/farm.getter.service';
import { BoostedYieldsFactors } from '../../models/farm.v2.model';
import { FarmAbiServiceV2 } from './farm.v2.abi.service';
import { FarmComputeServiceV2 } from './farm.v2.compute.service';
import { Mixin } from 'ts-mixer';
import {
    WeekTimekeepingGetterService
} from '../../../../submodules/week-timekeeping/services/week-timekeeping.getter.service';
import { IWeeklyRewardsSplittingGetterService } from '../../../../submodules/weekly-rewards-splitting/interfaces';
import { ClaimProgress } from '../../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { EnergyType } from '@elrondnetwork/erdjs-dex';
import { EsdtTokenPayment } from '../../../../models/esdtTokenPayment.model';

@Injectable()
export class FarmGetterServiceV2 extends Mixin(FarmGetterService, WeekTimekeepingGetterService) implements IWeeklyRewardsSplittingGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FarmAbiServiceV2,
        protected readonly computeService: FarmComputeServiceV2,
        protected readonly tokenGetter: TokenGetterService,
        protected readonly apiService: ElrondApiService,
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

    async getUserApr(scAddress: string, userAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'userApr', userAddress, week),
            () => this.computeService.computeUserApr(scAddress, userAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        )
    }

    async getAccumulatedRewardsForWeek(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'accumulatedRewardsForWeek', week),
            () => this.abiService.accumulatedRewardsForWeek(scAddress, week),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        )
    }

    async getUserAccumulatedRewardsForWeek(scAddress: string, week: number, userAddress: string, liquidity: string): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'userAccumulatedRewardsForWeek', week, userAddress),
            () => this.computeService.computeUserAccumulatedRewards(scAddress, week, userAddress, liquidity),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        )
    }

    async getOptimalRatio(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'optimalRatio', week),
            () => this.computeService.computeOptimalRatio(scAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        )
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


    async currentClaimProgress(scAddress: string, userAddress: string): Promise<ClaimProgress> {
        return this.getData(
            this.getCacheKey(scAddress, 'currentClaimProgress', userAddress),
            () => this.abiService.currentClaimProgress(scAddress, userAddress),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        )
    }

    async userEnergyForWeek(scAddress: string, userAddress: string, week: number): Promise<EnergyType> {
        return this.getData(
            this.getCacheKey(scAddress, 'userEnergyForWeek', userAddress, week),
            () => this.abiService.userEnergyForWeek(scAddress, userAddress, week),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        )
    }

    async userRewardsForWeek(scAddress: string, userAddress: string, week: number, energyAmount?: string, liquidity?: string,): Promise<EsdtTokenPayment[]> {
        return this.getData(
            this.getCacheKey(scAddress, 'userRewardsForWeek', userAddress, week),
            () => this.computeService.computeUserRewardsForWeek(scAddress, week, userAddress, energyAmount, liquidity),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        )
    }

    async userRewardsDistributionForWeek(scAddress: string, userAddress: string, week: number) {
        return this.getData(
            this.getCacheKey(scAddress, 'userRewardsDistributionForWeek', userAddress, week),
            () => this.computeService.computeUserRewardsDistributionForWeek(scAddress, week, userAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalRewardsDistributionForWeek(scAddress: string, week: number) {
        return this.getData(
            this.getCacheKey(scAddress, 'totalRewardsDistributionForWeek', week),
            () => this.computeService.computeTotalRewardsDistributionForWeek(scAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }


    async lastActiveWeekForUser(scAddress: string, userAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(scAddress, 'lastActiveWeekForUser', userAddress),
            () => this.abiService.lastActiveWeekForUser(scAddress, userAddress),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        )
    }

    async lastGlobalUpdateWeek(scAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(scAddress, 'lastGlobalUpdateWeek'),
            () => this.abiService.lastGlobalUpdateWeek(scAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        )
    }

    async totalRewardsForWeek(scAddress: string, week: number): Promise<EsdtTokenPayment[]> {
        return this.getData(
            this.getCacheKey(scAddress, 'totalRewardsForWeek', week),
            () => this.abiService.totalRewardsForWeek(scAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalEnergyForWeek(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'totalEnergyForWeek', week),
            () => this.abiService.totalEnergyForWeek(scAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async totalLockedTokensForWeek(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'totalLockedTokensForWeek', week),
            () => this.abiService.totalLockedTokensForWeek(scAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }
}
