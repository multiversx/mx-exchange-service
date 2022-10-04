import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { FeeDestination } from '../models/pair.model';
import { Logger } from 'winston';
import { TokenTtl } from 'src/helpers/cachingTTLs';

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
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setSecondTokenID(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'secondTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setLpTokenID(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'lpTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setTotalFeePercent(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'totalFeePercent'),
            value,
            oneMinute() * 5,
            oneMinute() * 2,
        );
    }

    async setSpecialFeePercent(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'specialFeePercent'),
            value,
            oneMinute() * 5,
            oneMinute() * 2,
        );
    }

    async setState(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'state'),
            value,
            oneMinute() * 5,
            oneMinute() * 2,
        );
    }

    async setFeeState(pairAddress: string, value: boolean): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'feeState'),
            value,
            oneMinute() * 5,
            oneMinute() * 2,
        );
    }

    async setFirstTokenReserve(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'firstTokenReserve'),
            value,
            oneMinute(),
            oneSecond() * 30,
        );
    }

    async setSecondTokenReserve(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'secondTokenReserve'),
            value,
            oneMinute(),
            oneSecond() * 30,
        );
    }

    async setTotalSupply(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'totalSupply'),
            value,
            oneMinute(),
            oneSecond() * 30,
        );
    }

    async setFirstTokenPrice(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'firstTokenPrice'),
            value,
            oneMinute(),
            oneSecond() * 30,
        );
    }

    async setSecondTokenPrice(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'secondTokenPrice'),
            value,
            oneMinute(),
            oneSecond() * 30,
        );
    }

    async setFirstTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'firstTokenPriceUSD'),
            value,
            oneMinute(),
            oneSecond() * 30,
        );
    }

    async setSecondTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'secondTokenPriceUSD'),
            value,
            oneMinute(),
            oneSecond() * 30,
        );
    }

    async setTokenPriceUSD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey('priceUSD', tokenID),
            value,
            oneMinute(),
            oneSecond() * 30,
        );
    }

    async setLpTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'lpTokenPriceUSD'),
            value,
            oneMinute(),
            oneSecond() * 30,
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
            oneMinute() * 5,
            oneMinute() * 2,
        );
    }

    async setType(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getPairCacheKey(pairAddress, 'type'),
            value,
            oneMinute() * 5,
            oneMinute() * 2,
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
