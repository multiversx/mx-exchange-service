import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';

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
        return await this.setData(
            this.getCacheKey('farmTokenID', stakeAddress),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setFarmingTokenID(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('farmingTokenID', stakeAddress),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setRewardTokenID(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('rewardTokenID', stakeAddress),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
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
        return await this.setData(
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
        return await this.setData(
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
        return await this.setData(
            this.getCacheKey('divisionSafetyConstant', stakeAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setState(stakeAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('state', stakeAddress),
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
                'userTotalFarmPosition',
                stakeAddress,
                userAddress,
            ),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }
}
