import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { FeeDestination } from '../models/pair.model';
import { Logger } from 'winston';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class PairSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'pair';
    }

    async setFirstTokenID(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'firstTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setSecondTokenID(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'secondTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setLpTokenID(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'lpTokenID'),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setTotalFeePercent(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'totalFeePercent'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setSpecialFeePercent(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'specialFeePercent'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setState(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'state'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setFeeState(pairAddress: string, value: boolean): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'feeState'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setFirstTokenReserve(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'firstTokenReserve'),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async setSecondTokenReserve(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'secondTokenReserve'),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async setTotalSupply(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'totalSupply'),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async setFirstTokenPrice(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'firstTokenPrice'),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setSecondTokenPrice(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'secondTokenPrice'),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setFirstTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'firstTokenPriceUSD'),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setSecondTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'secondTokenPriceUSD'),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setTokenPriceUSD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('priceUSD', tokenID),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setLpTokenPriceUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'lpTokenPriceUSD'),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setFirstTokenLockedValueUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'firstTokenLockedValueUSD'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setSecondTokenLockedValueUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'secondTokenLockedValueUSD'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setLockedValueUSD(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'lockedValueUSD'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setFirstTokenVolume(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, `firstTokenVolume.${time}`),
            value,
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async setSecondTokenVolume(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, `secondTokenVolume.${time}`),
            value,
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async setVolumeUSD(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, `volumeUSD.${time}`),
            value,
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async setFeesUSD(
        pairAddress: string,
        value: string,
        time: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, `feesUSD.${time}`),
            value,
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async setFeesAPR(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'feesAPR'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setType(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'type'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setRouterManagedAddress(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(pairAddress, 'initialLiquidtyAdder'),
            value,
            oneHour(),
        );
    }

    async setExternSwapGasLimit(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getCacheKey(
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
        const cacheKey = this.getCacheKey(
            pairAddress,
            'whitelistedManagedAddresses',
        );
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setFeeDestinations(pairAddress: string, value: FeeDestination[]) {
        const cacheKey = this.getCacheKey(pairAddress, 'feeDestinations');
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }

    async setTransferExecGasLimit(pairAddress: string, value: string) {
        const cacheKey = this.getCacheKey(
            pairAddress,
            'transferExecGasLimit',
        );
        await this.cachingService.setCache(cacheKey, value, oneHour());
        return cacheKey;
    }
}
