import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { FeeDestination } from '../models/pair.model';
import { Logger } from 'winston';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { PairInfoModel } from '../models/pair-info.model';

@Injectable()
export class PairSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'pair';
    }

    async setFirstTokenID(pairAddress: string, value: string): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('firstTokenID', pairAddress),
            value,
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async setSecondTokenID(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('secondTokenID', pairAddress),
            value,
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async setLpTokenID(pairAddress: string, value: string): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('lpTokenID', pairAddress),
            value,
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async setTotalFeePercent(
        pairAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('totalFeePercent', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setSpecialFeePercent(
        pairAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('specialFeePercent', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setState(pairAddress: string, value: string): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('state', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setFeeState(pairAddress: string, value: boolean): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('feeState', pairAddress),
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
            this.getCacheKey('firstTokenReserve', pairAddress),
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
            this.getCacheKey('secondTokenReserve', pairAddress),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async setTotalSupply(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('totalSupply', pairAddress),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async setPairInfoMetadata(
        pairAddress: string,
        value: PairInfoModel,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('pairInfoMetadata', pairAddress),
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
            this.getCacheKey('firstTokenPrice', pairAddress),
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
            this.getCacheKey('secondTokenPrice', pairAddress),
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
            this.getCacheKey('firstTokenPriceUSD', pairAddress),
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
            this.getCacheKey('secondTokenPriceUSD', pairAddress),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setTokenPriceUSD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('tokenPriceUSD', tokenID),
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
            this.getCacheKey('lpTokenPriceUSD', pairAddress),
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
            this.getCacheKey('firstTokenLockedValueUSD', pairAddress),
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
            this.getCacheKey('secondTokenLockedValueUSD', pairAddress),
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
            this.getCacheKey('lockedValueUSD', pairAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setFirstTokenVolume(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('firstTokenVolume', pairAddress),
            value,
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async setSecondTokenVolume(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('secondTokenVolume', pairAddress),
            value,
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async setVolumeUSD(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('volumeUSD', pairAddress),
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
            this.getCacheKey('feesUSD', pairAddress, time),
            value,
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async setFeesAPR(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('feesAPR', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setType(pairAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('type', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setRouterAddress(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('routerAddress', pairAddress),
            value,
            Constants.oneHour(),
        );
    }

    async setWhitelistedAddresses(
        pairAddress: string,
        value: string[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('whitelistedAddresses', pairAddress),
            value,
            Constants.oneHour(),
        );
    }

    async setFeeDestinations(pairAddress: string, value: FeeDestination[]) {
        return await this.setData(
            this.getCacheKey('feeDestinations', pairAddress),
            value,
            Constants.oneHour(),
        );
    }

    async setFeesCollectorAddress(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('feesCollectorAddress', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setFeesCollectorCutPercentage(
        pairAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('feesCollectorCutPercentage', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setHasFarms(pairAddress: string, value: boolean): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('hasFarms', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setHasDualFarms(
        pairAddress: string,
        value: boolean,
    ): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('hasDualFarms', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setTradesCount(pairAddress: string, value: number): Promise<string> {
        return await this.setData(
            this.getCacheKey('tradesCount', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setTradesCount24h(
        pairAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('tradesCount24h', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setDeployedAt(pairAddress: string, value: number): Promise<string> {
        return await this.setDataOrUpdateTtl(
            this.getCacheKey('deployedAt', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setInitialLiquidityAdder(
        pairAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('initialLiquidityAdder', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setTrustedSwapPairs(
        pairAddress: string,
        value: string[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('trustedSwapPairs', pairAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }
}
