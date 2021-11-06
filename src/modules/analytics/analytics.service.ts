import {
    BytesValue,
    Interaction,
    SmartContract,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { ContextService } from '../../services/context/context.service';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { awsConfig, farmsConfig } from '../../config';
import { PairService } from '../pair/services/pair.service';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CachingService } from '../../services/caching/cache.service';
import { oneMinute } from '../../helpers/helpers';
import { FarmGetterService } from '../farm/services/farm.getter.service';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { HistoricDataModel } from './models/analytics.model';

@Injectable()
export class AnalyticsService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly context: ContextService,
        private readonly farmGetterService: FarmGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(tokenID, 'tokenPriceUSD');
        try {
            const getTokenPriceUSD = () => this.computeTokenPriceUSD(tokenID);

            return this.cachingService.getOrSet(
                cacheKey,
                getTokenPriceUSD,
                oneMinute(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getTokenPriceUSD.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async computeTokenPriceUSD(tokenID: string): Promise<string> {
        const tokenPriceUSD = await this.pairService.getPriceUSDByPath(tokenID);
        return tokenPriceUSD.toFixed();
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [
            farmingToken,
            farmingTokenPriceUSD,
            farmingTokenReserve,
        ] = await Promise.all([
            this.farmGetterService.getFarmingToken(farmAddress),
            this.farmGetterService.getFarmingTokenPriceUSD(farmAddress),
            this.farmGetterService.getFarmingTokenReserve(farmAddress),
        ]);

        const lockedValue = new BigNumber(farmingTokenReserve)
            .multipliedBy(`1e-${farmingToken.decimals}`)
            .multipliedBy(farmingTokenPriceUSD);

        return lockedValue.toFixed();
    }

    async getTotalValueLockedUSD(): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey('totalValueLockedUSD');
        try {
            const getTotalValueLockedUSD = () =>
                this.computeTotalValueLockedUSD();
            return this.cachingService.getOrSet(
                cacheKey,
                getTotalValueLockedUSD,
                oneMinute() * 2,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getTotalValueLockedUSD.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async computeTotalValueLockedUSD(): Promise<string> {
        const pairsAddress = await this.context.getAllPairsAddress();
        let totalValueLockedUSD = new BigNumber(0);
        const promises = pairsAddress.map(pairAddress =>
            this.pairGetterService.getLockedValueUSD(pairAddress),
        );

        const lockedValuesUSD = await Promise.all([
            ...promises,
            this.computeFarmLockedValueUSD(farmsConfig[2]),
        ]);

        for (const lockedValueUSD of lockedValuesUSD) {
            totalValueLockedUSD = totalValueLockedUSD.plus(lockedValueUSD);
        }

        return totalValueLockedUSD.toFixed();
    }

    async getLockedValueUSDFarms(): Promise<string> {
        let totalLockedValue = new BigNumber(0);
        const promises: Promise<string>[] = farmsConfig.map(farmAddress =>
            this.computeFarmLockedValueUSD(farmAddress),
        );
        const farmsLockedValueUSD = await Promise.all(promises);
        for (const farmLockedValueUSD of farmsLockedValueUSD) {
            totalLockedValue = totalLockedValue.plus(farmLockedValueUSD);
        }

        return totalLockedValue.toFixed();
    }

    async getTotalAgregatedRewards(days: number): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            days,
            'totalAgregatedRewards',
        );
        try {
            const getTotalAgregatedRewards = () =>
                this.computeTotalAgregatedRewards(days);
            return this.cachingService.getOrSet(
                cacheKey,
                getTotalAgregatedRewards,
                oneMinute() * 2,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getTotalAgregatedRewards.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async computeTotalAgregatedRewards(days: number): Promise<string> {
        const farmsAddress: [] = farmsConfig;
        const promises = farmsAddress.map(async farmAddress =>
            this.farmGetterService.getRewardsPerBlock(farmAddress),
        );
        const farmsRewardsPerBlock = await Promise.all(promises);
        const blocksNumber = (days * 24 * 60 * 60) / 6;

        let totalAgregatedRewards = new BigNumber(0);
        for (const rewardsPerBlock of farmsRewardsPerBlock) {
            const agregatedRewards = new BigNumber(
                rewardsPerBlock,
            ).multipliedBy(blocksNumber);
            totalAgregatedRewards = totalAgregatedRewards.plus(
                agregatedRewards,
            );
        }

        return totalAgregatedRewards.toFixed();
    }

    async getTotalTokenSupply(tokenID: string): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(tokenID, 'totalTokenSupply');
        try {
            const getTotalTokenSupply = () =>
                this.computeTotalTokenSupply(tokenID);
            return this.cachingService.getOrSet(
                cacheKey,
                getTotalTokenSupply,
                oneMinute() * 2,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getTotalTokenSupply.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async computeTotalTokenSupply(tokenID: string): Promise<string> {
        const pairsAddress = await this.context.getAllPairsAddress();
        const farmsAddress = farmsConfig;
        const contractsPromises: Promise<SmartContract>[] = [];

        for (const pairAddress of pairsAddress) {
            contractsPromises.push(
                this.elrondProxy.getPairSmartContract(pairAddress),
            );
        }

        for (const farmAddress of farmsAddress) {
            contractsPromises.push(
                this.elrondProxy.getFarmSmartContract(farmAddress),
            );
        }

        contractsPromises.push(this.elrondProxy.getProxyDexSmartContract());
        contractsPromises.push(
            this.elrondProxy.getLockedAssetFactorySmartContract(),
        );

        const contracts = await Promise.all(contractsPromises);
        const tokenSuppliesPromises = contracts.map(async contract => {
            return this.getTokenSupply(contract, tokenID);
        });
        const tokenSupplies = await Promise.all(tokenSuppliesPromises);
        const token = await this.context.getTokenMetadata(tokenID);

        let totalTokenSupply = new BigNumber(0);
        for (const tokenSupply of tokenSupplies) {
            totalTokenSupply = totalTokenSupply.plus(tokenSupply);
        }

        return totalTokenSupply.toFixed();
    }

    async getTokenSupply(
        contract: SmartContract,
        tokenID: string,
    ): Promise<BigNumber> {
        const [mintedToken, burnedToken] = await Promise.all([
            this.getMintedToken(contract, tokenID),
            this.getBurnedToken(contract, tokenID),
        ]);

        return mintedToken.minus(burnedToken);
    }

    async getMintedToken(
        contract: SmartContract,
        tokenID: string,
    ): Promise<BigNumber> {
        let mintedMex: BigNumber;
        try {
            const interaction: Interaction = contract.methods.getGeneratedTokenAmount(
                [BytesValue.fromUTF8(tokenID)],
            );

            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            mintedMex = response.firstValue.valueOf();
        } catch (error) {
            mintedMex = new BigNumber(0);
            console.log(error);
        }
        return mintedMex;
    }

    async getBurnedToken(
        contract: SmartContract,
        tokenID: string,
    ): Promise<BigNumber> {
        let burnedMex: BigNumber;
        try {
            const interaction: Interaction = contract.methods.getBurnedTokenAmount(
                [BytesValue.fromUTF8(tokenID)],
            );
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            burnedMex = response.firstValue.valueOf();
        } catch (error) {
            burnedMex = new BigNumber(0);
            console.log(error);
        }

        return burnedMex;
    }

    async getHistoricData(
        series: string,
        metric: string,
        time: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'historicData',
            series,
            metric,
            time,
        );
        try {
            const getHistoricData = () =>
                this.awsTimestreamQuery.getValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                    time,
                });
            return this.cachingService.getOrSet(
                cacheKey,
                getHistoricData,
                oneMinute() * 5,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getHistoricData.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getClosingValue(
        series: string,
        metric: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'closingValue',
            series,
            metric,
            time,
        );
        try {
            const getClosingValue = () =>
                this.awsTimestreamQuery.getClosingValue({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                    time,
                });
            return this.cachingService.getOrSet(
                cacheKey,
                getClosingValue,
                oneMinute() * 5,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getClosingValue.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'completeValues',
            series,
            metric,
        );
        try {
            const getCompleteValues = () =>
                this.awsTimestreamQuery.getCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                });
            return this.cachingService.getOrSet(
                cacheKey,
                getCompleteValues,
                oneMinute() * 5,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getCompleteValues.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getLatestCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestCompleteValues',
            series,
            metric,
        );
        try {
            const getLatestCompleteValues = () =>
                this.awsTimestreamQuery.getLatestCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                });
            return this.cachingService.getOrSet(
                cacheKey,
                getLatestCompleteValues,
                oneMinute() * 5,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getLatestCompleteValues.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getLatestValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestValues',
            series,
            metric,
        );
        try {
            const getLatestValues = () =>
                this.awsTimestreamQuery.getLatestValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                });
            return this.cachingService.getOrSet(
                cacheKey,
                getLatestValues,
                oneMinute() * 5,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getLatestValues.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getMarketValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'marketValues',
            series,
            metric,
        );
        try {
            const getMarketValues = () =>
                this.awsTimestreamQuery.getMarketValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                });
            return this.cachingService.getOrSet(
                cacheKey,
                getMarketValues,
                oneMinute() * 5,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getMarketValues.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getMarketCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'marketCompleteValues',
            series,
            metric,
        );
        try {
            const getMarketCompleteValues = () =>
                this.awsTimestreamQuery.getMarketCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                });
            return this.cachingService.getOrSet(
                cacheKey,
                getMarketCompleteValues,
                oneMinute() * 5,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getMarketCompleteValues.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
