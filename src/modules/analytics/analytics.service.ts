import {
    BytesValue,
    Interaction,
    SmartContract,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { ContextService } from '../../services/context/context.service';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { farmsConfig } from '../../config';
import { FarmService } from '../farm/farm.service';
import { PairService } from '../pair/pair.service';
import { TransactionCollectorService } from '../../services/transactions/transaction.collector.service';
import { TransactionInterpreterService } from '../../services/transactions/transaction.interpreter.service';
import { TransactionMappingService } from '../../services/transactions/transaction.mapping.service';
import {
    AnalyticsModel,
    FactoryAnalyticsModel,
    PairAnalyticsModel,
    TokenAnalyticsModel,
} from './models/analytics.model';
import {
    processFactoryAnalytics,
    processPairsAnalytics,
    processTokensAnalytics,
} from './analytics.processor';
import { PairAnalyticsService } from '../pair/pair.analytics.service';

export interface TradingInfoType {
    volumeUSD: BigNumber;
    feesUSD: BigNumber;
}

@Injectable()
export class AnalyticsService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly context: ContextService,
        private readonly farmService: FarmService,
        private readonly pairService: PairService,
        private readonly pairAnalytics: PairAnalyticsService,
        private readonly transactionCollector: TransactionCollectorService,
        private readonly transactionInterpreter: TransactionInterpreterService,
        private readonly transactionMapping: TransactionMappingService,
    ) {}

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        const tokenPriceUSD = await this.pairService.getPriceUSDByPath(tokenID);
        return tokenPriceUSD.toFixed();
    }

    async getFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [
            farmingToken,
            farmingTokenPriceUSD,
            farmingTokenReserve,
        ] = await Promise.all([
            this.farmService.getFarmingToken(farmAddress),
            this.farmService.getFarmingTokenPriceUSD(farmAddress),
            this.farmService.getFarmingTokenReserve(farmAddress),
        ]);

        const lockedValue = new BigNumber(farmingTokenReserve)
            .multipliedBy(`1e-${farmingToken.decimals}`)
            .multipliedBy(farmingTokenPriceUSD);

        return lockedValue.toFixed();
    }

    async getTotalValueLockedUSD(): Promise<string> {
        const pairsAddress = await this.context.getAllPairsAddress();
        let totalValueLockedUSD = new BigNumber(0);
        const promises = pairsAddress.map(pairAddress =>
            this.pairAnalytics.getPairLockedValueUSD(pairAddress),
        );

        const lockedValuesUSD = await Promise.all([
            ...promises,
            this.getFarmLockedValueUSD(farmsConfig[2]),
        ]);

        for (const lockedValueUSD of lockedValuesUSD) {
            totalValueLockedUSD = totalValueLockedUSD.plus(lockedValueUSD);
        }

        return totalValueLockedUSD.toFixed();
    }

    async getLockedValueUSDFarms(): Promise<string> {
        let totalLockedValue = new BigNumber(0);
        const promises: Promise<string>[] = farmsConfig.map(farmAddress =>
            this.getFarmLockedValueUSD(farmAddress),
        );
        const farmsLockedValueUSD = await Promise.all(promises);
        for (const farmLockedValueUSD of farmsLockedValueUSD) {
            totalLockedValue = totalLockedValue.plus(farmLockedValueUSD);
        }

        return totalLockedValue.toFixed();
    }

    async getTotalAgregatedRewards(days: number): Promise<string> {
        const farmsAddress: [] = farmsConfig;
        const promises = farmsAddress.map(async farmAddress =>
            this.farmService.getRewardsPerBlock(farmAddress),
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

        factoryAnalytics.totalValueLockedUSD = await this.getTotalValueLockedUSD();
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
                this.pairService.getFirstTokenID(pair.address),
                this.pairService.getSecondTokenID(pair.address),
                this.pairService.getPairInfoMetadata(pair.address),
                this.pairAnalytics.getFirstTokenValueLockedUSD(pair.address),
                this.pairAnalytics.getSecondTokenValueLockedUSD(pair.address),
                this.pairAnalytics.getPairLockedValueUSD(pair.address),
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
}
