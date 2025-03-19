import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { BoostedYieldsFactors } from 'src/modules/farm/models/farm.v2.model';

@Injectable()
export class StakingSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'stake';
    }

    async setFarmTokenID(stakeAddress: string, value: string): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('farmTokenID', stakeAddress),
            value,
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async setFarmingTokenID(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('farmingTokenID', stakeAddress),
            value,
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async setRewardTokenID(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('rewardTokenID', stakeAddress),
            value,
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async setFarmTokenSupply(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('farmTokenSupply', stakeAddress),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async setRewardPerShare(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('rewardPerShare', stakeAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setAccumulatedRewards(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('accumulatedRewards', stakeAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setRewardCapacity(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('rewardCapacity', stakeAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setAnnualPercentageRewards(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('annualPercentageRewards', stakeAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setStakeFarmAPR(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('stakeFarmAPR', stakeAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setMinUnbondEpochs(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('minUnboundEpochs', stakeAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setPerBlockRewardAmount(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('perBlockRewards', stakeAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setLastRewardBlockNonce(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('lastRewardBlockNonce', stakeAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setDivisionSafetyConstant(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('divisionSafetyConstant', stakeAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setState(stakeAddress: string, value: string): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('state', stakeAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setBoostedYieldsFactors(
        stakeAddress: string,
        value: BoostedYieldsFactors,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('boostedYieldsFactors', stakeAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setUserTotalStakePosition(
        stakeAddress: string,
        userAddress: string,
        value: string,
    ): Promise<string> {
        return this.setData(
            this.getCacheKey(
                'userTotalStakePosition',
                stakeAddress,
                userAddress,
            ),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
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
                'userRewardsForWeek',
                scAddress,
                userAddress,
                week,
            ),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }
}
