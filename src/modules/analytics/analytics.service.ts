import {
    BytesValue,
    Interaction,
    SmartContract,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { ContextService } from '../../services/context/context.service';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { farmsConfig } from '../../config';
import { PairService } from '../pair/services/pair.service';
import { TransactionCollectorService } from '../../services/transactions/transaction.collector.service';
import { TransactionInterpreterService } from '../../services/transactions/transaction.interpreter.service';
import { TransactionMappingService } from '../../services/transactions/transaction.mapping.service';
import {
    AnalyticsModel,
    PairAnalyticsModel,
    TokenAnalyticsModel,
} from './models/analytics.model';
import {
    processFactoryAnalytics,
    processPairsAnalytics,
    processTokensAnalytics,
} from './analytics.processor';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CachingService } from '../../services/caching/cache.service';
import { oneMinute } from '../../helpers/helpers';
import { FarmGetterService } from '../farm/services/farm.getter.service';
import { PairGetterService } from '../pair/services/pair.getter.service';

export interface TradingInfoType {
    volumeUSD: BigNumber;
    feesUSD: BigNumber;
}

@Injectable()
export class AnalyticsService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly context: ContextService,
        private readonly farmGetterService: FarmGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly transactionCollector: TransactionCollectorService,
        private readonly transactionInterpreter: TransactionInterpreterService,
        private readonly transactionMapping: TransactionMappingService,
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

    async getFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const cacheKey = generateCacheKeyFromParams(
            'farm',
            farmAddress,
            'lockedValueUSD',
        );
        try {
            const getFarmLockedValueUSD = () =>
                this.computeFarmLockedValueUSD(farmAddress);

            return this.cachingService.getOrSet(
                cacheKey,
                getFarmLockedValueUSD,
                oneMinute() * 2,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getFarmLockedValueUSD.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
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
        totalTokenSupply = totalTokenSupply
            .plus(token.minted)
            .minus(token.burnt);

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

    async getAnalytics(): Promise<AnalyticsModel> {
        const transactions = await this.transactionCollector.getNewTransactions();
        const esdtTransferTransactions = this.transactionInterpreter.getESDTTransferTransactions(
            transactions,
        );
        const swapTransactions = this.transactionInterpreter.getSwapTransactions(
            esdtTransferTransactions,
        );

        const promises = swapTransactions.map(swapTransaction => {
            return this.transactionMapping.handleSwap(swapTransaction);
        });

        const swapTradingInfos = await Promise.all(promises);
        const factoryAnalytics = processFactoryAnalytics(swapTradingInfos);
        const pairsAnalytics = processPairsAnalytics(swapTradingInfos);
        const tokensAnalytics = processTokensAnalytics(swapTradingInfos);

        factoryAnalytics.totalValueLockedUSD = await this.computeTotalValueLockedUSD();
        const pairsAddress = await this.context.getPairsMetadata();
        for (const pair of pairsAddress) {
            const [
                firstTokenID,
                secondTokenID,
                pairReserves,
                firstTokenLockedValueUSD,
                secondTokenLockedValueUSD,
                totalValueLockedUSD,
            ] = await Promise.all([
                this.pairGetterService.getFirstTokenID(pair.address),
                this.pairGetterService.getSecondTokenID(pair.address),
                this.pairGetterService.getPairInfoMetadata(pair.address),
                this.pairGetterService.getFirstTokenLockedValueUSD(
                    pair.address,
                ),
                this.pairGetterService.getSecondTokenLockedValueUSD(
                    pair.address,
                ),
                this.pairGetterService.getLockedValueUSD(pair.address),
            ]);
            const pairAnalytics = pairsAnalytics.find(
                swap => swap.pairAddress === pair.address,
            );
            if (pairAnalytics) {
                pairAnalytics.totalValueLockedUSD = totalValueLockedUSD;
                pairAnalytics.totalValueLockedFirstToken =
                    pairReserves.reserves0;
                pairAnalytics.totalValueLockedSecondToken =
                    pairReserves.reserves1;
                pairAnalytics.liquidity = pairReserves.totalSupply;
            } else {
                pairsAnalytics.push(
                    new PairAnalyticsModel({
                        pairAddress: pair.address,
                        totalValueLockedUSD: totalValueLockedUSD,
                        totalValueLockedFirstToken: pairReserves.reserves0,
                        totalValueLockedSecondToken: pairReserves.reserves1,
                        liquidity: pairReserves.totalSupply,
                        feesUSD: '0',
                        volumesUSD: '0',
                    }),
                );
            }

            const firstToken = tokensAnalytics.find(
                token => token.tokenID === firstTokenID,
            );
            if (firstToken) {
                firstToken.totalValueLocked = pairReserves.reserves0;
                firstToken.totalValueLockedUSD = firstTokenLockedValueUSD;
            } else {
                tokensAnalytics.push(
                    new TokenAnalyticsModel({
                        tokenID: firstTokenID,
                        totalValueLocked: pairReserves.reserves0,
                        totalValueLockedUSD: firstTokenLockedValueUSD,
                        volume: '0',
                        volumeUSD: '0',
                        feesUSD: '0',
                    }),
                );
            }

            const secondToken = tokensAnalytics.find(
                token => token.tokenID === secondTokenID,
            );
            if (secondToken) {
                secondToken.totalValueLocked = pairReserves.reserves1;
                secondToken.totalValueLockedUSD = secondTokenLockedValueUSD;
            } else {
                tokensAnalytics.push(
                    new TokenAnalyticsModel({
                        tokenID: secondTokenID,
                        totalValueLocked: pairReserves.reserves1,
                        totalValueLockedUSD: secondTokenLockedValueUSD,
                        volume: '0',
                        volumeUSD: '0',
                        feesUSD: '0',
                    }),
                );
            }
        }

        return new AnalyticsModel({
            factory: factoryAnalytics,
            pairs: pairsAnalytics,
            tokens: tokensAnalytics,
        });
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
