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
    FactoryTradingModel,
    PairTradingModel,
    TradingInfoModel,
} from 'src/models/analytics.model';

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
        private readonly transactionCollector: TransactionCollectorService,
        private readonly transactionInterpreter: TransactionInterpreterService,
        private readonly transactionMapping: TransactionMappingService,
    ) {}

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        const tokenPriceUSD = await this.pairService.getPriceUSDByPath(tokenID);
        return tokenPriceUSD.toFixed();
    }

    async getLockedValueUSDFarms(): Promise<string> {
        let totalLockedValue = new BigNumber(0);
        for (const farmAddress of farmsConfig) {
            const farmingToken = await this.farmService.getFarmingToken(
                farmAddress,
            );
            const lockedValue = await this.farmService.getFarmingTokenReserve(
                farmAddress,
            );
            const farmingTokenPriceUSD = await this.farmService.getFarmingTokenPriceUSD(
                farmAddress,
            );
            const lockedValueDenom = new BigNumber(lockedValue).multipliedBy(
                `1e-${farmingToken.decimals}`,
            );
            const lockedValueUSD = new BigNumber(lockedValueDenom).multipliedBy(
                new BigNumber(farmingTokenPriceUSD),
            );
            totalLockedValue = totalLockedValue.plus(lockedValueUSD);
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

    async getTradingInfo(): Promise<TradingInfoModel> {
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

        const rawTradingInfos = await Promise.all(promises);

        const factoryTradingInfo = new FactoryTradingModel();
        factoryTradingInfo.totalVolumesUSD = new BigNumber(0).toFixed();
        factoryTradingInfo.totalFeesUSD = new BigNumber(0).toFixed();

        const pairsTradingInfoMap = new Map<string, TradingInfoType>();
        for (const rawTradingInfo of rawTradingInfos) {
            factoryTradingInfo.totalFeesUSD = new BigNumber(
                factoryTradingInfo.totalFeesUSD,
            )
                .plus(rawTradingInfo.feesUSD)
                .toFixed();
            factoryTradingInfo.totalVolumesUSD = new BigNumber(
                factoryTradingInfo.totalVolumesUSD,
            )
                .plus(rawTradingInfo.volumeUSD)
                .toFixed();

            if (!pairsTradingInfoMap.has(rawTradingInfo.pairAddress)) {
                pairsTradingInfoMap.set(rawTradingInfo.pairAddress, {
                    volumeUSD: rawTradingInfo.volumeUSD,
                    feesUSD: rawTradingInfo.feesUSD,
                });
            } else {
                const pairTransactionVolume = pairsTradingInfoMap.get(
                    rawTradingInfo.pairAddress,
                );
                pairsTradingInfoMap.set(rawTradingInfo.pairAddress, {
                    volumeUSD: pairTransactionVolume.volumeUSD.plus(
                        rawTradingInfo.volumeUSD,
                    ),
                    feesUSD: pairTransactionVolume.feesUSD.plus(
                        rawTradingInfo.feesUSD,
                    ),
                });
            }
        }

        const pairsTradingInfos: PairTradingModel[] = [];
        pairsTradingInfoMap.forEach((value, key) => {
            pairsTradingInfos.push({
                pairAddress: key,
                volumesUSD: value.volumeUSD.toFixed(),
                feesUSD: value.feesUSD.toFixed(),
            });
        });

        return {
            factory: factoryTradingInfo,
            pairs: pairsTradingInfos,
        };
    }
}
