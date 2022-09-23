import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { awsConfig, constantsConfig, elrondData } from 'src/config';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElrondDataService } from 'src/services/elrond-communication/elrond-data.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { PairInfoModel } from '../models/pair-info.model';
import { FeeDestination, LockedTokensInfo } from '../models/pair.model';
import { PairAbiService } from './pair.abi.service';
import { PairComputeService } from './pair.compute.service';

@Injectable()
export class PairGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly contextGetter: ContextGetterService,
        private readonly abiService: PairAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairComputeService: PairComputeService,
        private readonly tokenGetter: TokenGetterService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        private readonly elrondDataService: ElrondDataService,
    ) {
        super(cachingService, logger);
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            this.getPairCacheKey(pairAddress, 'firstTokenID'),
            () => this.abiService.getFirstTokenID(pairAddress),
            oneHour(),
        );
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            this.getPairCacheKey(pairAddress, 'secondTokenID'),
            () => this.abiService.getSecondTokenID(pairAddress),
            oneHour(),
        );
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            this.getPairCacheKey(pairAddress, 'lpTokenID'),
            () => this.abiService.getLpTokenID(pairAddress),
            oneHour(),
        );
    }

    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        return this.tokenGetter.getTokenMetadata(firstTokenID);
    }

    async getSecondToken(pairAddress: string): Promise<EsdtToken> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        return this.tokenGetter.getTokenMetadata(secondTokenID);
    }

    async getLpToken(pairAddress: string): Promise<EsdtToken> {
        const lpTokenID = await this.getLpTokenID(pairAddress);
        return lpTokenID === undefined
            ? undefined
            : await this.tokenGetter.getTokenMetadata(lpTokenID);
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
            this.getPairCacheKey(pairAddress, 'firstTokenPrice'),
            () => this.pairComputeService.computeFirstTokenPrice(pairAddress),
            oneSecond() * 12,
        );
    }

    async getSecondTokenPrice(pairAddress: string): Promise<string> {
        return this.getData(
            this.getPairCacheKey(pairAddress, 'secondTokenPrice'),
            () => this.pairComputeService.computeSecondTokenPrice(pairAddress),
            oneSecond() * 12,
        );
    }

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        return await this.getData(
            this.getPairCacheKey('priceUSD', tokenID),
            () => this.tokenCompute.computeTokenPriceDerivedUSD(tokenID),
            oneSecond() * 12,
        );
    }

    async getFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'firstTokenPriceUSD'),
            () =>
                this.pairComputeService.computeFirstTokenPriceUSD(pairAddress),
            oneSecond() * 12,
        );
    }

    async getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'secondTokenPriceUSD'),
            () =>
                this.pairComputeService.computeSecondTokenPriceUSD(pairAddress),
            oneSecond() * 12,
        );
    }

    async getLpTokenPriceUSD(pairAddress: string): Promise<string> {
        return this.getData(
            this.getPairCacheKey(pairAddress, 'lpTokenPriceUSD'),
            () => this.pairComputeService.computeLpTokenPriceUSD(pairAddress),
            oneSecond() * 12,
        );
    }

    async getFirstTokenReserve(pairAddress: string): Promise<string> {
        const tokenID = await this.getFirstTokenID(pairAddress);
        return this.getData(
            this.getPairCacheKey(pairAddress, 'firstTokenReserve'),
            () => this.abiService.getTokenReserve(pairAddress, tokenID),
            oneSecond() * 12,
        );
    }

    async getSecondTokenReserve(pairAddress: string): Promise<string> {
        const tokenID = await this.getSecondTokenID(pairAddress);
        return this.getData(
            this.getPairCacheKey(pairAddress, 'secondTokenReserve'),
            () => this.abiService.getTokenReserve(pairAddress, tokenID),
            oneSecond() * 12,
        );
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        return this.getData(
            this.getPairCacheKey(pairAddress, 'totalSupply'),
            () => this.abiService.getTotalSupply(pairAddress),
            oneSecond() * 12,
        );
    }

    async getFirstTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            this.getPairCacheKey(pairAddress, 'firstTokenLockedValueUSD'),
            () =>
                this.pairComputeService.computeFirstTokenLockedValueUSD(
                    pairAddress,
                ),
            oneMinute(),
        );
    }

    async getSecondTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            this.getPairCacheKey(pairAddress, 'secondTokenLockedValueUSD'),
            () =>
                this.pairComputeService.computeSecondTokenLockedValueUSD(
                    pairAddress,
                ),
            oneMinute(),
        );
    }

    async getLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            this.getPairCacheKey(pairAddress, 'lockedValueUSD'),
            () => this.pairComputeService.computeLockedValueUSD(pairAddress),
            oneMinute(),
        );
    }

    async getFirstTokenVolume(
        pairAddress: string,
        start: string,
    ): Promise<string> {
        const isTimescaleReadActive =
            await this.elrondDataService.isReadActive();
        return this.getData(
            this.getPairCacheKey(pairAddress, `firstTokenVolume.${start}`),
            () => {
                isTimescaleReadActive
                    ? this.elrondDataService.getAggregatedValue({
                          series: pairAddress,
                          key: 'firstTokenVolume',
                          start,
                      })
                    : this.awsTimestreamQuery.getAggregatedValue({
                          table: awsConfig.timestream.tableName,
                          series: pairAddress,
                          metric: 'firstTokenVolume',
                          time: start,
                      });
            },
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async getSecondTokenVolume(
        pairAddress: string,
        start: string,
    ): Promise<string> {
        const isTimescaleReadActive =
            await this.elrondDataService.isReadActive();
        return this.getData(
            this.getPairCacheKey(pairAddress, `secondTokenVolume.${start}`),
            () => {
                isTimescaleReadActive
                    ? this.elrondDataService.getAggregatedValue({
                          series: pairAddress,
                          key: 'secondTokenVolume',
                          start,
                      })
                    : this.awsTimestreamQuery.getAggregatedValue({
                          table: awsConfig.timestream.tableName,
                          series: pairAddress,
                          metric: 'secondTokenVolume',
                          time: start,
                      });
            },
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async getVolumeUSD(pairAddress: string, start: string): Promise<string> {
        const isTimescaleReadActive =
            await this.elrondDataService.isReadActive();
        return this.getData(
            this.getPairCacheKey(pairAddress, `volumeUSD.${start}`),
            () => {
                isTimescaleReadActive
                    ? this.elrondDataService.getAggregatedValue({
                          series: pairAddress,
                          key: 'volumeUSD',
                          start,
                      })
                    : this.awsTimestreamQuery.getAggregatedValue({
                          table: awsConfig.timestream.tableName,
                          series: pairAddress,
                          metric: 'volumeUSD',
                          time: start,
                      });
            },
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async getFeesUSD(pairAddress: string, start: string): Promise<string> {
        const isTimescaleReadActive =
            await this.elrondDataService.isReadActive();
        return this.getData(
            this.getPairCacheKey(pairAddress, `feesUSD.${start}`),
            () => {
                isTimescaleReadActive
                    ? this.elrondDataService.getAggregatedValue({
                          series: pairAddress,
                          key: 'feesUSD',
                          start,
                      })
                    : this.awsTimestreamQuery.getAggregatedValue({
                          table: awsConfig.timestream.tableName,
                          series: pairAddress,
                          metric: 'feesUSD',
                          time: start,
                      });
            },
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async getFeesAPR(pairAddress: string): Promise<string> {
        return this.getData(
            this.getPairCacheKey(pairAddress, 'feesAPR'),
            () => this.pairComputeService.computeFeesAPR(pairAddress),
            oneMinute() * 5,
        );
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const [firstTokenReserve, secondTokenReserve, totalSupply] =
            await Promise.all([
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
            this.getPairCacheKey(pairAddress, 'totalFeePercent'),
            () => this.abiService.getTotalFeePercent(pairAddress),
            oneHour(),
        );
        return new BigNumber(totalFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getSpecialFeePercent(pairAddress: string): Promise<number> {
        const specialFeePercent = await this.getData(
            this.getPairCacheKey(pairAddress, 'specialFeePercent'),
            () => this.abiService.getSpecialFeePercent(pairAddress),
            oneHour(),
        );
        return new BigNumber(specialFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getTrustedSwapPairs(pairAddress: string): Promise<string[]> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'trustedSwapPairs'),
            () => this.abiService.getTrustedSwapPairs(pairAddress),
            oneSecond(),
        );
    }

    async getInitialLiquidityAdder(pairAddress: string): Promise<string> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'initialLiquidtyAdder'),
            () => this.abiService.getInitialLiquidityAdder(pairAddress),
            oneHour(),
        );
    }

    async getState(pairAddress: string): Promise<string> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'state'),
            () => this.abiService.getState(pairAddress),
            oneHour(),
        );
    }

    async getFeeState(pairAddress: string): Promise<boolean> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'feeState'),
            () => this.abiService.getFeeState(pairAddress),
            oneMinute(),
        );
    }

    async getType(pairAddress: string): Promise<string> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'type'),
            () => this.pairComputeService.computeTypeFromTokens(pairAddress),
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

    async getFeeDestinations(pairAddress: string): Promise<FeeDestination[]> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'feeDestinations'),
            () => this.abiService.getFeeDestinations(pairAddress),
            oneHour(),
        );
    }

    async getWhitelistedManagedAddresses(
        pairAddress: string,
    ): Promise<string[]> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'whitelistedManagedAddresses'),
            () => this.abiService.getWhitelistedManagedAddresses(pairAddress),
            oneHour(),
        );
    }

    async getRouterManagedAddress(address: string): Promise<string> {
        return await this.getData(
            this.getPairCacheKey(address, 'routerManagedAddress'),
            () => this.abiService.getRouterManagedAddress(address),
            oneHour(),
        );
    }

    async getRouterOwnerManagedAddress(address: string): Promise<string> {
        return await this.getData(
            this.getPairCacheKey(address, 'routerOwnerManagedAddress'),
            () => this.abiService.getRouterOwnerManagedAddress(address),
            oneHour(),
        );
    }

    async getExternSwapGasLimit(pairAddress: string): Promise<number> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'externSwapGasLimit'),
            () => this.abiService.getExternSwapGasLimit(pairAddress),
            oneHour(),
        );
    }

    async getTransferExecGasLimit(pairAddress: string): Promise<number> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'transferExecGasLimit'),
            () => this.abiService.getTransferExecGasLimit(pairAddress),
            oneHour(),
        );
    }

    async updateAndGetSafePrice(
        pairAddress: string,
        esdtTokenPayment: EsdtTokenPayment,
    ): Promise<EsdtTokenPayment> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'safePrice'),
            () =>
                this.abiService.updateAndGetSafePrice(
                    pairAddress,
                    esdtTokenPayment,
                ),
            oneMinute(),
        );
    }

    async getNumSwapsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<number> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'numSwapsByAddress', address),
            () => this.abiService.getNumSwapsByAddress(pairAddress, address),
            oneMinute(),
        );
    }

    async getNumAddsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<string> {
        return await this.getData(
            this.getPairCacheKey(pairAddress, 'numAddsByAddress', address),
            () => this.abiService.getNumAddsByAddress(pairAddress, address),
            oneMinute(),
        );
    }

    private getPairCacheKey(pairAddress: string, ...args: any) {
        return generateCacheKeyFromParams('pair', pairAddress, ...args);
    }
}
