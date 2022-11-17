import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class StakingSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setPairContractManagedAddress(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'pairAddress'),
            value,
            oneHour(),
        );
    }

    async setFarmTokenID(stakeAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'farmTokenID'),
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
            this.getStakeCacheKey(stakeAddress, 'farmingTokenID'),
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
            this.getStakeCacheKey(stakeAddress, 'rewardTokenID'),
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
            this.getStakeCacheKey(stakeAddress, 'farmTokenSupply'),
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
            this.getStakeCacheKey(stakeAddress, 'rewardPerShare'),
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
            this.getStakeCacheKey(stakeAddress, 'accumulatedRewards'),
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
            this.getStakeCacheKey(stakeAddress, 'rewardCapacity'),
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
            this.getStakeCacheKey(stakeAddress, 'annualPercentageRewards'),
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
            this.getStakeCacheKey(stakeAddress, 'minUnboundEpochs'),
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
            this.getStakeCacheKey(stakeAddress, 'perBlockRewards'),
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
            this.getStakeCacheKey(stakeAddress, 'lastRewardBlockNonce'),
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
            this.getStakeCacheKey(stakeAddress, 'divisionSafetyConstant'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setState(stakeAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'state'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    private getStakeCacheKey(stakeAddress: string, ...args: any) {
        return generateCacheKeyFromParams('stake', stakeAddress, ...args);
    }
}
