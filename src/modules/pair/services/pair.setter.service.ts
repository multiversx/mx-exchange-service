import { Injectable } from '@nestjs/common';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';

@Injectable()
export class PairSetterService {
    constructor(private readonly cachingService: CachingService) {}

    async setFirstTokenID(pairAddress: string, value: string): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'firstTokenID');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setSecondTokenID(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'secondTokenID');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setLpTokenID(pairAddress: string, value: string): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'lpTokenID');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setTotalFeePercent(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'totalFeePercent');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setSpecialFeePercent(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'specialFeePercent');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setState(pairAddress: string, value: string): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'state');
        await this.cachingService.setCache(cacheKey, value, oneSecond() * 45);
        return cacheKey;
    }

    async setFirstTokenReserve(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'firstTokenReserve');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setSecondTokenReserve(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            'secondTokenReserve',
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setTotalSupply(pairAddress: string, value: string): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'totalSupply');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setFirstTokenPrice(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'firstTokenPrice');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setSecondTokenPrice(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'secondTokenPrice');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setFirstTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            'firstTokenPriceUSD',
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setSecondTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            'secondTokenPriceUSD',
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setTokenPriceUSD(tokenID: string, value: string): Promise<string> {
        const cacheKey = this.getPairCacheKey('priceUSD', tokenID);
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setLpTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'lpTokenPriceUSD');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setFirstTokenLockedValueUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            'firstTokenLockedValueUSD',
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setSecondTokenLockedValueUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            'secondTokenLockedValueUSD',
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setLockedValueUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'lockedValueUSD');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setFirstTokenVolume(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            `firstTokenVolume.${time}`,
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setSecondTokenVolume(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            `secondTokenVolume.${time}`,
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setVolumeUSD(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, `volumeUSD.${time}`);
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setFeesUSD(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, `feesUSD.${time}`);
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setFeesAPR(pairAddress: string, value: string): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'feesAPR');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setBurnedTokenAmount(
        pairAddress: string,
        tokenID: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            `${tokenID}.burnedTokenAmount`,
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    private getPairCacheKey(pairAddress: string, ...args: any) {
        return generateCacheKeyFromParams('pair', pairAddress, ...args);
    }
}
