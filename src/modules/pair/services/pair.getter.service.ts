import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { awsConfig, constantsConfig } from 'src/config';
import { oneHour } from 'src/helpers/helpers';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { SimpleLockModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
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
    ) {
        super(cachingService, logger);
        this.baseKey = 'pair';
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, 'firstTokenID'),
            () => this.abiService.getFirstTokenID(pairAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, 'secondTokenID'),
            () => this.abiService.getSecondTokenID(pairAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, 'lpTokenID'),
            () => this.abiService.getLpTokenID(pairAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
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
            this.getCacheKey(pairAddress, 'firstTokenPrice'),
            () => this.pairComputeService.computeFirstTokenPrice(pairAddress),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getSecondTokenPrice(pairAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, 'secondTokenPrice'),
            () => this.pairComputeService.computeSecondTokenPrice(pairAddress),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        return await this.getData(
            this.getCacheKey('priceUSD', tokenID),
            () => this.tokenCompute.computeTokenPriceDerivedUSD(tokenID),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'firstTokenPriceUSD'),
            () =>
                this.pairComputeService.computeFirstTokenPriceUSD(pairAddress),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'secondTokenPriceUSD'),
            () =>
                this.pairComputeService.computeSecondTokenPriceUSD(pairAddress),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getLpTokenPriceUSD(pairAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, 'lpTokenPriceUSD'),
            () => this.pairComputeService.computeLpTokenPriceUSD(pairAddress),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getFirstTokenReserve(pairAddress: string): Promise<string> {
        const tokenID = await this.getFirstTokenID(pairAddress);
        return this.getData(
            this.getCacheKey(pairAddress, 'firstTokenReserve'),
            () => this.abiService.getTokenReserve(pairAddress, tokenID),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getSecondTokenReserve(pairAddress: string): Promise<string> {
        const tokenID = await this.getSecondTokenID(pairAddress);
        return this.getData(
            this.getCacheKey(pairAddress, 'secondTokenReserve'),
            () => this.abiService.getTokenReserve(pairAddress, tokenID),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, 'totalSupply'),
            () => this.abiService.getTotalSupply(pairAddress),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getFirstTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, 'firstTokenLockedValueUSD'),
            () =>
                this.pairComputeService.computeFirstTokenLockedValueUSD(
                    pairAddress,
                ),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getSecondTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, 'secondTokenLockedValueUSD'),
            () =>
                this.pairComputeService.computeSecondTokenLockedValueUSD(
                    pairAddress,
                ),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, 'lockedValueUSD'),
            () => this.pairComputeService.computeLockedValueUSD(pairAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getFirstTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, `firstTokenVolume.${time}`),
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'firstTokenVolume',
                    time,
                }),
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async getSecondTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, `secondTokenVolume.${time}`),
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'secondTokenVolume',
                    time,
                }),
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async getVolumeUSD(pairAddress: string, time: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, `volumeUSD.${time}`),
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'volumeUSD',
                    time,
                }),
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async getFeesUSD(pairAddress: string, time: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, `feesUSD.${time}`),
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'feesUSD',
                    time,
                }),
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async getFeesAPR(pairAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(pairAddress, 'feesAPR'),
            () => this.pairComputeService.computeFeesAPR(pairAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            this.getCacheKey(pairAddress, 'totalFeePercent'),
            () => this.abiService.getTotalFeePercent(pairAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
        return new BigNumber(totalFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getSpecialFeePercent(pairAddress: string): Promise<number> {
        const specialFeePercent = await this.getData(
            this.getCacheKey(pairAddress, 'specialFeePercent'),
            () => this.abiService.getSpecialFeePercent(pairAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
        return new BigNumber(specialFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getTrustedSwapPairs(pairAddress: string): Promise<string[]> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'trustedSwapPairs'),
            () => this.abiService.getTrustedSwapPairs(pairAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getInitialLiquidityAdder(pairAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'initialLiquidtyAdder'),
            () => this.abiService.getInitialLiquidityAdder(pairAddress),
            oneHour(),
        );
    }

    async getState(pairAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'state'),
            () => this.abiService.getState(pairAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getFeeState(pairAddress: string): Promise<boolean> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'feeState'),
            () => this.abiService.getFeeState(pairAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getType(pairAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'type'),
            () => this.pairComputeService.computeTypeFromTokens(pairAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getLockingScAddress(
        pairAddress: string,
    ): Promise<string | undefined> {
        const cacheKey = this.getCacheKey(pairAddress, 'lockingScAddress');
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
        await this.cachingService.setCache(
            cacheKey,
            '',
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
        return undefined;
    }

    async getUnlockEpoch(pairAddress: string): Promise<number | undefined> {
        const cacheKey = this.getCacheKey(pairAddress, 'unlockEpoch');
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
        await this.cachingService.setCache(
            cacheKey,
            -1,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
        return undefined;
    }

    async getLockingDeadlineEpoch(
        pairAddress: string,
    ): Promise<number | undefined> {
        const cacheKey = this.getCacheKey(pairAddress, 'lockingDeadlineEpoch');
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
        await this.cachingService.setCache(
            cacheKey,
            -1,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
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
            lockingScAddress: lockingScAddress,
            lockingSC: new SimpleLockModel({ address: lockingScAddress }),
            unlockEpoch,
            lockingDeadlineEpoch,
        });
    }

    async getFeeDestinations(pairAddress: string): Promise<FeeDestination[]> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'feeDestinations'),
            () => this.abiService.getFeeDestinations(pairAddress),
            oneHour(),
        );
    }

    async getWhitelistedManagedAddresses(
        pairAddress: string,
    ): Promise<string[]> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'whitelistedManagedAddresses'),
            () => this.abiService.getWhitelistedManagedAddresses(pairAddress),
            oneHour(),
        );
    }

    async getRouterManagedAddress(address: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(address, 'routerManagedAddress'),
            () => this.abiService.getRouterManagedAddress(address),
            oneHour(),
        );
    }

    async getRouterOwnerManagedAddress(address: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(address, 'routerOwnerManagedAddress'),
            () => this.abiService.getRouterOwnerManagedAddress(address),
            oneHour(),
        );
    }

    async getExternSwapGasLimit(pairAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'externSwapGasLimit'),
            () => this.abiService.getExternSwapGasLimit(pairAddress),
            oneHour(),
        );
    }

    async getTransferExecGasLimit(pairAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'transferExecGasLimit'),
            () => this.abiService.getTransferExecGasLimit(pairAddress),
            oneHour(),
        );
    }

    async updateAndGetSafePrice(
        pairAddress: string,
        esdtTokenPayment: EsdtTokenPayment,
    ): Promise<EsdtTokenPayment> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'safePrice'),
            () =>
                this.abiService.updateAndGetSafePrice(
                    pairAddress,
                    esdtTokenPayment,
                ),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getNumSwapsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<number> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'numSwapsByAddress', address),
            () => this.abiService.getNumSwapsByAddress(pairAddress, address),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getNumAddsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<string> {
        return await this.getData(
            this.getCacheKey(pairAddress, 'numAddsByAddress', address),
            () => this.abiService.getNumAddsByAddress(pairAddress, address),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }
}
