import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TokenTtl } from 'src/helpers/cachingTTLs';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class FarmSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setFarmTokenID(farmAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'farmTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setFarmingTokenID(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'farmingTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setFarmedTokenID(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'farmedTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setFarmTokenSupply(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'farmTokenSupply'),
            value,
            oneMinute(),
        );
    }

    async setFarmingTokenReserve(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'farmingTokenReserve'),
            value,
            oneMinute(),
        );
    }

    async setRewardsPerBlock(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'rewardsPerBlock'),
            value,
            oneMinute() * 2,
        );
    }

    async setPenaltyPercent(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'penaltyPercent'),
            value,
            oneMinute(),
        );
    }

    async setMinimumFarmingEpochs(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'minimumFarmingEpochs'),
            value,
            oneHour(),
        );
    }

    async setState(farmAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'state'),
            value,
            oneMinute(),
        );
    }

    async setProduceRewardsEnabled(
        farmAddress: string,
        value: boolean,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'produceRewardsEnabled'),
            value,
            oneMinute() * 2,
        );
    }

    async setRewardPerShare(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'rewardPerShare'),
            value,
            oneMinute(),
        );
    }

    async setRewardReserve(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'rewardReserve'),
            value,
            oneMinute(),
        );
    }

    async setLastRewardBlockNonce(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'lastRewardBlocknonce'),
            value,
            oneMinute(),
        );
    }

    async setUndistributedFees(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'undistributedFees'),
            value,
            oneMinute(),
        );
    }

    async setCurrentBlockFee(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'currentBlockFee'),
            value,
            oneMinute(),
        );
    }

    async setDivisionSafetyConstant(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'divisionSafetyConstant'),
            value,
            oneHour(),
        );
    }

    async setLockedRewardAprMuliplier(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'aprMultiplier'),
            value,
            oneMinute(),
        );
    }

    async setFarmedTokenPriceUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'farmedTokenPriceUSD'),
            value,
            oneMinute(),
        );
    }

    async setFarmingTokenPriceUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'farmingTokenPriceUSD'),
            value,
            oneMinute(),
        );
    }

    async setTotalValueLockedUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'totalValueLockedUSD'),
            value,
            oneMinute(),
        );
    }

    async setUnlockedRewardsAPR(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'unlockedRewardsAPR'),
            value,
            oneMinute(),
        );
    }

    async setLockedRewardsAPR(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'lockedRewardsAPR'),
            value,
            oneMinute(),
        );
    }

    async setFarmAPR(farmAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getFarmCacheKey(farmAddress, 'farmAPR'),
            value,
            oneMinute(),
        );
    }

    private getFarmCacheKey(farmAddress: string, ...args: any) {
        return generateCacheKeyFromParams('farm', farmAddress, ...args);
    }
}
