import { Injectable } from '@nestjs/common';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';

@Injectable()
export class FarmSetterService {
    constructor(private readonly cachingService: CachingService) {}

    async setFarmTokenID(farmAddress: string, value: string): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'farmTokenID');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setFarmingTokenID(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'farmingTokenID');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setFarmedTokenID(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'farmedTokenID');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setFarmTokenSupply(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'farmTokenSupply');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setFarmingTokenReserve(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(
            farmAddress,
            'farmingTokenReserve',
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setRewardsPerBlock(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'rewardsPerBlock');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setPenaltyPercent(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'penaltyPercent');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setMinimumFarmingEpochs(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(
            farmAddress,
            'minimumFarmingEpochs',
        );
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setState(farmAddress: string, value: string): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'state');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setRewardPerShare(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'rewardPerShare');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setLastRewardBlockNonce(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(
            farmAddress,
            'lastRewardBlocknonce',
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setUndistributedFees(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'undistributedFees');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setCurrentBlockFee(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'currentBlockFee');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setDivisionSafetyConstant(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(
            farmAddress,
            'divisionSafetyConstant',
        );
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setFarmedTokenPriceUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(
            farmAddress,
            'farmedTokenPriceUSD',
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setFarmingTokenPriceUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(
            farmAddress,
            'farmingTokenPriceUSD',
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setTotalValueLockedUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(
            farmAddress,
            'totalValueLockedUSD',
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    private getFarmCacheKey(farmAddress: string, ...args: any) {
        return generateCacheKeyFromParams('farm', farmAddress, ...args);
    }
}
