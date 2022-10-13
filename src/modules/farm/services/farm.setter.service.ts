import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';

@Injectable()
export class FarmSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'farm';
    }

    async setFarmTokenID(farmAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'farmTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setFarmingTokenID(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'farmingTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setFarmedTokenID(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'farmedTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setFarmTokenSupply(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'farmTokenSupply'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setFarmingTokenReserve(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'farmingTokenReserve'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setRewardsPerBlock(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'rewardsPerBlock'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setPenaltyPercent(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'penaltyPercent'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setMinimumFarmingEpochs(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'minimumFarmingEpochs'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setState(farmAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'state'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setProduceRewardsEnabled(
        farmAddress: string,
        value: boolean,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'produceRewardsEnabled'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setRewardPerShare(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'rewardPerShare'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setRewardReserve(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'rewardReserve'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setLastRewardBlockNonce(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'lastRewardBlocknonce'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setUndistributedFees(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'undistributedFees'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setCurrentBlockFee(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'currentBlockFee'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setDivisionSafetyConstant(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'divisionSafetyConstant'),
            value,
            oneHour(),
        );
    }

    async setLockedRewardAprMuliplier(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'aprMultiplier'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setFarmedTokenPriceUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'farmedTokenPriceUSD'),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setFarmingTokenPriceUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'farmingTokenPriceUSD'),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setTotalValueLockedUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'totalValueLockedUSD'),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async setUnlockedRewardsAPR(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'unlockedRewardsAPR'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setLockedRewardsAPR(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'lockedRewardsAPR'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setFarmAPR(farmAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(farmAddress, 'farmAPR'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }
}
