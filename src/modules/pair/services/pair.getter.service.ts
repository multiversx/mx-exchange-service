import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { awsConfig, constantsConfig } from 'src/config';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { PairInfoModel } from '../models/pair-info.model';
import {
    BPConfig,
    EsdtTokenPayment,
    FeeDestination,
    LiquidityPosition,
    LockedTokensInfo,
} from '../models/pair.model';
import { PairAbiService } from './pair.abi.service';
import { PairComputeService } from './pair.compute.service';
import { PairDBService } from './pair.db.service';

@Injectable()
export class PairGetterService {
    constructor(
        private readonly contextGetter: ContextGetterService,
        private readonly cachingService: CachingService,
        private readonly abiService: PairAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairComputeService: PairComputeService,
        private readonly pairDbService: PairDBService,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        pairAddress: string,
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getPairCacheKey(pairAddress, key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PairGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'firstTokenID',
            () => this.abiService.getFirstTokenID(pairAddress),
            oneHour(),
        );
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'secondTokenID',
            () => this.abiService.getSecondTokenID(pairAddress),
            oneHour(),
        );
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'lpTokenID',
            () => this.abiService.getLpTokenID(pairAddress),
            oneHour(),
        );
    }

    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        return this.contextGetter.getTokenMetadata(firstTokenID);
    }

    async getSecondToken(pairAddress: string): Promise<EsdtToken> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        return this.contextGetter.getTokenMetadata(secondTokenID);
    }

    async getLpToken(pairAddress: string): Promise<EsdtToken> {
        const lpTokenID = await this.getLpTokenID(pairAddress);
        if (lpTokenID === 'undefined') {
            return undefined;
        }
        return this.contextGetter.getTokenMetadata(lpTokenID);
    }

    async getTokenPrice(pairAddress: string, tokenID: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
        ]);

        switch (tokenID) {
            case firstTokenID:
                return this.getFirstTokenPrice(pairAddress);
            case secondTokenID:
                return this.getSecondTokenPrice(pairAddress);
        }
    }

    async getFirstTokenPrice(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'firstTokenPrice',
            () => this.pairComputeService.computeFirstTokenPrice(pairAddress),
            oneSecond() * 12,
        );
    }

    async getSecondTokenPrice(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'secondTokenPrice',
            () => this.pairComputeService.computeSecondTokenPrice(pairAddress),
            oneSecond() * 12,
        );
    }

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        return await this.getData(
            'priceUSD',
            tokenID,
            () => this.pairComputeService.computeTokenPriceUSD(tokenID),
            oneSecond() * 12,
        );
    }

    async getFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'firstTokenPriceUSD',
            () =>
                this.pairComputeService.computeFirstTokenPriceUSD(pairAddress),
            oneSecond() * 12,
        );
    }

    async getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'secondTokenPriceUSD',
            () =>
                this.pairComputeService.computeSecondTokenPriceUSD(pairAddress),
            oneSecond() * 12,
        );
    }

    async getLpTokenPriceUSD(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'lpTokenPriceUSD',
            () => this.pairComputeService.computeLpTokenPriceUSD(pairAddress),
            oneSecond() * 12,
        );
    }

    async getFirstTokenReserve(pairAddress: string): Promise<string> {
        const tokenID = await this.getFirstTokenID(pairAddress);
        return this.getData(
            pairAddress,
            'firstTokenReserve',
            () => this.abiService.getTokenReserve(pairAddress, tokenID),
            oneSecond() * 12,
        );
    }

    async getSecondTokenReserve(pairAddress: string): Promise<string> {
        const tokenID = await this.getSecondTokenID(pairAddress);
        return this.getData(
            pairAddress,
            'secondTokenReserve',
            () => this.abiService.getTokenReserve(pairAddress, tokenID),
            oneSecond() * 12,
        );
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'totalSupply',
            () => this.abiService.getTotalSupply(pairAddress),
            oneSecond() * 12,
        );
    }

    async getFirstTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'firstTokenLockedValueUSD',
            () =>
                this.pairComputeService.computeFirstTokenLockedValueUSD(
                    pairAddress,
                ),
            oneMinute(),
        );
    }

    async getSecondTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'secondTokenLockedValueUSD',
            () =>
                this.pairComputeService.computeSecondTokenLockedValueUSD(
                    pairAddress,
                ),
            oneMinute(),
        );
    }

    async getLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'lockedValueUSD',
            () => this.pairComputeService.computeLockedValueUSD(pairAddress),
            oneMinute(),
        );
    }

    async getFirstTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        return this.getData(
            pairAddress,
            `firstTokenVolume.${time}`,
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'firstTokenVolume',
                    time,
                }),
            oneMinute(),
        );
    }

    async getSecondTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        return this.getData(
            pairAddress,
            `secondTokenVolume.${time}`,
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'secondTokenVolume',
                    time,
                }),
            oneMinute(),
        );
    }

    async getVolumeUSD(pairAddress: string, time: string): Promise<string> {
        return this.getData(
            pairAddress,
            `volumeUSD.${time}`,
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'volumeUSD',
                    time,
                }),
            oneMinute(),
        );
    }

    async getFeesUSD(pairAddress: string, time: string): Promise<string> {
        return this.getData(
            pairAddress,
            `feesUSD.${time}`,
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'feesUSD',
                    time,
                }),
            oneMinute(),
        );
    }

    async getFeesAPR(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'feesAPR',
            () => this.pairComputeService.computeFeesAPR(pairAddress),
            oneMinute(),
        );
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const [
            firstTokenReserve,
            secondTokenReserve,
            totalSupply,
        ] = await Promise.all([
            this.getFirstTokenReserve(pairAddress),
            this.getSecondTokenReserve(pairAddress),
            this.getTotalSupply(pairAddress),
        ]);

        return new PairInfoModel({
            reserves0: firstTokenReserve,
            reserves1: secondTokenReserve,
            totalSupply: totalSupply,
        });
    }

    async getTotalFeePercent(pairAddress: string): Promise<number> {
        const totalFeePercent = await this.getData(
            pairAddress,
            'totalFeePercent',
            () => this.abiService.getTotalFeePercent(pairAddress),
            oneHour(),
        );
        return new BigNumber(totalFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getSpecialFeePercent(pairAddress: string): Promise<number> {
        const specialFeePercent = await this.getData(
            pairAddress,
            'specialFeePercent',
            () => this.abiService.getSpecialFeePercent(pairAddress),
            oneHour(),
        );
        return new BigNumber(specialFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getTrustedSwapPairs(pairAddress: string): Promise<string[]> {
        return await this.getData(
            pairAddress,
            'trustedSwapPairs',
            () => this.abiService.getTrustedSwapPairs(pairAddress),
            oneSecond(),
        );
    }

    async getInitialLiquidityAdder(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'initialLiquidtyAdder',
            () => this.abiService.getInitialLiquidityAdder(pairAddress),
            oneHour(),
        );
    }

    async getState(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'state',
            () => this.abiService.getState(pairAddress),
            oneHour(),
        );
    }

    async getType(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'type',
            () => this.pairDbService.getPairType(pairAddress),
            oneMinute(),
        );
    }

    async getLockingScAddress(
        pairAddress: string,
    ): Promise<string | undefined> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'lockingScAddress');
        const cachedValue: string = await this.cachingService.getCache(
            cacheKey,
        );
        if (cachedValue === '') {
            return undefined;
        }
        if (cachedValue) {
            return cachedValue;
        }
        const value = await this.abiService.getLockingScAddress(pairAddress);
        if (value) {
            await this.cachingService.setCache(cacheKey, value, oneHour());
            return value;
        }
        await this.cachingService.setCache(cacheKey, '', oneMinute() * 10);
        return undefined;
    }

    async getUnlockEpoch(pairAddress: string): Promise<number | undefined> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'unlockEpoch');
        const cachedValue: number = await this.cachingService.getCache(
            cacheKey,
        );
        if (cachedValue === -1) {
            return undefined;
        }
        if (cachedValue) {
            return cachedValue;
        }
        const value = await this.abiService.getUnlockEpoch(pairAddress);
        if (value) {
            await this.cachingService.setCache(cacheKey, value, oneHour());
            return value;
        }
        await this.cachingService.setCache(cacheKey, -1, oneMinute() * 10);
        return undefined;
    }

    async getLockingDeadlineEpoch(
        pairAddress: string,
    ): Promise<number | undefined> {
        const cacheKey = this.getPairCacheKey(
            pairAddress,
            'lockingDeadlineEpoch',
        );
        const cachedValue: number = await this.cachingService.getCache(
            cacheKey,
        );
        if (cachedValue === -1) {
            return undefined;
        }
        if (cachedValue) {
            return cachedValue;
        }
        const value = await this.abiService.getLockingDeadlineEpoch(
            pairAddress,
        );
        if (value) {
            await this.cachingService.setCache(cacheKey, value, oneHour());
            return value;
        }
        await this.cachingService.setCache(cacheKey, -1, oneMinute() * 10);
        return undefined;
    }

    async getLockedTokensInfo(pairAddress: string): Promise<LockedTokensInfo> {
        const [
            lockingScAddress,
            unlockEpoch,
            lockingDeadlineEpoch,
            currentEpoch,
        ] = await Promise.all([
            this.getLockingScAddress(pairAddress),
            this.getUnlockEpoch(pairAddress),
            this.getLockingDeadlineEpoch(pairAddress),
            this.contextGetter.getCurrentEpoch(),
        ]);

        if (
            lockingScAddress === undefined ||
            unlockEpoch === undefined ||
            lockingDeadlineEpoch === undefined
        ) {
            return undefined;
        }

        if (currentEpoch >= lockingDeadlineEpoch) {
            return undefined;
        }

        return new LockedTokensInfo({
            lockingScAddress,
            unlockEpoch,
            lockingDeadlineEpoch,
        });
    }

    private getPairCacheKey(pairAddress: string, ...args: any) {
        return generateCacheKeyFromParams('pair', pairAddress, ...args);
    }

    async getTokensForGivenPosition(
        pairAddress: string,
        liquidityAmount: string,
    ): Promise<LiquidityPosition> {
        return await this.getData(
            pairAddress,
            'tokensForGivenPosition',
            () =>
                this.abiService.getTokensForGivenPosition(
                    pairAddress,
                    liquidityAmount,
                ),
            oneMinute(),
        );
    }

    async getReservesAndTotalSupply(
        pairAddress: string,
    ): Promise<PairInfoModel> {
        return await this.getData(
            pairAddress,
            'reservesAndTotalSupply',
            () => this.abiService.getReservesAndTotalSupply(pairAddress),
            oneMinute(),
        );
    }

    async getFeeState(pairAddress: string): Promise<Boolean> {
        return await this.getData(
            pairAddress,
            'feeState',
            () => this.abiService.getFeeState(pairAddress),
            oneMinute(),
        );
    }

    async getFeeDestinations(pairAddress: string): Promise<FeeDestination[]> {
        return await this.getData(
            pairAddress,
            'feeDestinations',
            () => this.abiService.getFeeDestinations(pairAddress),
            oneMinute(),
        );
    }

    async getWhitelistedManagedAddresses(
        pairAddress: string,
    ): Promise<string[]> {
        return await this.getData(
            pairAddress,
            'whitelistedManagedAddresses',
            () => this.abiService.getWhitelistedManagedAddresses(pairAddress),
            oneMinute(),
        );
    }

    async getRouterManagedAddress(address: string): Promise<string> {
        return await this.getData(
            address,
            'routerManagedAddress',
            () => this.abiService.getRouterManagedAddress(address),
            oneMinute(),
        );
    }

    async getRouterOwnerManagedAddress(address: string): Promise<string> {
        return await this.getData(
            address,
            'routerOwnerManagedAddress',
            () => this.abiService.getRouterOwnerManagedAddress(address),
            oneMinute(),
        );
    }

    async getExternSwapGasLimit(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'externSwapGasLimit',
            () => this.abiService.getExternSwapGasLimit(pairAddress),
            oneMinute(),
        );
    }

    async getReserve(pairAddress: string, tokenID: string): Promise<string> {
        return await this.abiService.getReserve(pairAddress, tokenID);
    }

    async getTransferExecGasLimit(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'transferExecGasLimit',
            () => this.abiService.getTransferExecGasLimit(pairAddress),
            oneMinute(),
        );
    }

    async updateAndGetSafePrice(
        pairAddress: string,
        esdtTokenPayment: EsdtTokenPayment,
    ): Promise<EsdtTokenPayment> {
        return await this.abiService.updateAndGetSafePrice(
            pairAddress,
            esdtTokenPayment,
        );
    }

    async getBPSwapConfig(pairAddress: string): Promise<BPConfig> {
        /*return await this.getData(
            pairAddress,
            'BPSwapConfig',
            () => this.abiService.getBPSwapConfig(pairAddress),
            oneMinute(),
        );*/
        return await this.abiService.getBPSwapConfig(pairAddress);
    }

    async getBPRemoveConfig(pairAddress: string): Promise<BPConfig> {
        /*return await this.getData(
            pairAddress,
            'BPSwapConfig',
            () => this.abiService.getBPSwapConfig(pairAddress),
            oneMinute(),
        );*/
        return await this.abiService.getBPRemoveConfig(pairAddress);
    }

    async getBPAddConfig(pairAddress: string): Promise<BPConfig> {
        /*return await this.getData(
            pairAddress,
            'BPSwapConfig',
            () => this.abiService.getBPSwapConfig(pairAddress),
            oneMinute(),
        );*/
        return await this.abiService.getBPAddConfig(pairAddress);
    }

    async getNumSwapsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<string> {
        return await this.abiService.getNumSwapsByAddress(pairAddress, address);
    }

    async getNumAddsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<string> {
        return await this.abiService.getNumAddsByAddress(pairAddress, address);
    }
}
