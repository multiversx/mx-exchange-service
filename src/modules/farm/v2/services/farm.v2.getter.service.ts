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
import {
    WeeklyRewardsSplittingGetterService
} from '../../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import { Mixin } from 'ts-mixer';
import {
    WeekTimekeepingGetterService
} from '../../../../submodules/week-timekeeping/services/week-timekeeping.getter.service';

@Injectable()
export class FarmGetterServiceV2 extends Mixin(FarmGetterService, WeekTimekeepingGetterService, WeeklyRewardsSplittingGetterService)  {
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

    async getAccumulatedRewardsForWeek(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getCacheKey(scAddress, 'accumulatedRewardsForWeek', week),
            () => this.abiService.accumulatedRewardsForWeek(scAddress, week),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
}
