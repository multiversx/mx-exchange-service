import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { FeeDestination } from '../models/pair.model';
import { Logger } from 'winston';

@Injectable()
export class PairSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setFirstTokenID(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'firstTokenID'),
            value,
            oneHour(),
        );
    }

    async setSecondTokenID(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'secondTokenID'),
            value,
            oneHour(),
        );
    }

    async setLpTokenID(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'lpTokenID'),
            value,
            oneHour(),
        );
    }

    async setTotalFeePercent(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'totalFeePercent'),
            value,
            oneHour(),
        );
    }

    async setSpecialFeePercent(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'specialFeePercent'),
            value,
            oneHour(),
        );
    }

    async setState(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'state'),
            value,
            oneHour(),
        );
    }

    async setFeeState(pairAddress: string, value: boolean): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'feeState'),
            value,
            oneHour(),
        );
    }

    async setFirstTokenReserve(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'firstTokenReserve'),
            value,
            oneSecond() * 12,
        );
    }

    async setSecondTokenReserve(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'secondTokenReserve'),
            value,
            oneSecond() * 12,
        );
    }

    async setTotalSupply(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'totalSupply'),
            value,
            oneSecond() * 12,
        );
    }

    async setFirstTokenPrice(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'firstTokenPrice'),
            value,
            oneSecond() * 12,
        );
    }

    async setSecondTokenPrice(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'secondTokenPrice'),
            value,
            oneSecond() * 12,
        );
    }

    async setFirstTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'firstTokenPriceUSD'),
            value,
            oneSecond() * 12,
        );
    }

    async setSecondTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'secondTokenPriceUSD'),
            value,
            oneSecond() * 12,
        );
    }

    async setTokenPriceUSD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey('priceUSD', tokenID),
            value,
            oneSecond() * 12,
        );
    }

    async setLpTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'lpTokenPriceUSD'),
            value,
            oneSecond() * 12,
        );
    }

    async setFirstTokenLockedValueUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'firstTokenLockedValueUSD'),
            value,
            oneMinute(),
        );
    }

    async setSecondTokenLockedValueUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'secondTokenLockedValueUSD'),
            value,
            oneMinute(),
        );
    }

    async setLockedValueUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'lockedValueUSD'),
            value,
            oneMinute(),
        );
    }

    async setFirstTokenVolume(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, `firstTokenVolume.${time}`),
            value,
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async setSecondTokenVolume(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, `secondTokenVolume.${time}`),
            value,
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async setVolumeUSD(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, `volumeUSD.${time}`),
            value,
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async setFeesUSD(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, `feesUSD.${time}`),
            value,
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async setFeesAPR(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'feesAPR'),
            value,
            oneMinute(),
        );
    }

    async setType(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'type'),
            value,
            oneMinute(),
        );
    }

    async setRouterManagedAddress(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'initialLiquidtyAdder'),
            value,
            oneHour(),
        );
    }

    async setExternSwapGasLimit(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            'externSwapGasLimit',
        );
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setWhitelistedManagedAddresses(
        pairAddress: string,
        value: string[],
    ): Promise<string> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            'whitelistedManagedAddresses',
        );
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setFeeDestinations(pairAddress: string, value: FeeDestination[]) {
        const cacheKey = this.getPairCacheKey(pairAddress, 'feeDestinations');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setTransferExecGasLimit(pairAddress: string, value: string) {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            'transferExecGasLimit',
        );
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    private getPairCacheKey(pairAddress: string, ...args: any) {
        return generateCacheKeyFromParams('pair', pairAddress, ...args);
    }
}
