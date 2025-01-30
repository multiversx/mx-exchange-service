import { Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { constantsConfig, scAddress } from 'src/config';
import {
    FarmRewardType,
    FarmVersion,
} from 'src/modules/farm/models/farm.model';
import { farmsAddresses, farmType, farmVersion } from 'src/utils/farm.utils';
import { FarmComputeFactory } from 'src/modules/farm/farm.compute.factory';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { RemoteConfigGetterService } from '../../remote-config/remote-config.getter.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { StakingComputeService } from 'src/modules/staking/services/staking.compute.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import {
    TradingActivityAction,
    TradingActivityModel,
} from '../models/trading.activity.model';
import { SwapEvent } from '@multiversx/sdk-exchange';
import { convertEventTopicsAndDataToBase64 } from 'src/utils/elastic.search.utils';
import { ElasticSearchEventsService } from 'src/services/elastic-search/services/es.events.service';
import { RawElasticEventType } from 'src/services/elastic-search/entities/raw.elastic.event';
import { EsdtTokenPaymentModel } from 'src/modules/tokens/models/esdt.token.payment.model';

@Injectable()
export class AnalyticsComputeService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly farmAbi: FarmAbiFactory,
        private readonly farmCompute: FarmComputeFactory,
        private readonly pairAbi: PairAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly stakingCompute: StakingComputeService,
        private readonly tokenCompute: TokenComputeService,
        private readonly tokenService: TokenService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly elasticEventsService: ElasticSearchEventsService,
    ) {}

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneMinute() * 10,
        localTtl: Constants.oneMinute() * 5,
    })
    async lockedValueUSDFarms(): Promise<string> {
        return await this.computeLockedValueUSDFarms();
    }

    async computeLockedValueUSDFarms(): Promise<string> {
        let totalLockedValue = new BigNumber(0);

        const promises: Promise<string>[] = [];
        for (const farmAddress of farmsAddresses()) {
            promises.push(
                this.farmCompute
                    .useCompute(farmAddress)
                    .computeFarmLockedValueUSD(farmAddress),
            );
        }
        const farmsLockedValueUSD = await Promise.all(promises);
        for (const farmLockedValueUSD of farmsLockedValueUSD) {
            const farmLockedValueUSDBig = new BigNumber(farmLockedValueUSD);
            totalLockedValue = !farmLockedValueUSDBig.isNaN()
                ? totalLockedValue.plus(farmLockedValueUSD)
                : totalLockedValue;
        }

        return totalLockedValue.toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneMinute() * 10,
        localTtl: Constants.oneMinute() * 5,
    })
    async totalValueLockedUSD(): Promise<string> {
        return await this.computeTotalValueLockedUSD();
    }

    async computeTotalValueLockedUSD(): Promise<string> {
        const pairsAddress = await this.routerAbi.pairsAddress();
        const filteredPairs = await this.fiterPairsByIssuedLpToken(
            pairsAddress,
        );

        let totalValueLockedUSD = new BigNumber(0);
        const promises = filteredPairs.map((pairAddress) =>
            this.pairCompute.lockedValueUSD(pairAddress),
        );

        const lockedValuesUSD = await Promise.all([...promises]);

        for (const lockedValueUSD of lockedValuesUSD) {
            const lockedValuesUSDBig = new BigNumber(lockedValueUSD);
            totalValueLockedUSD = !lockedValuesUSDBig.isNaN()
                ? totalValueLockedUSD.plus(lockedValuesUSDBig)
                : totalValueLockedUSD;
        }

        return totalValueLockedUSD.toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneMinute() * 10,
        localTtl: Constants.oneMinute() * 5,
    })
    async totalValueStakedUSD(): Promise<string> {
        return await this.computeTotalValueStakedUSD();
    }

    async computeTotalValueStakedUSD(): Promise<string> {
        let totalValueLockedUSD = new BigNumber(0);

        const stakingAddresses =
            await this.remoteConfigGetterService.getStakingAddresses();
        const promises = stakingAddresses.map((stakingAddress) =>
            this.stakingCompute.stakedValueUSD(stakingAddress),
        );

        promises.push(this.computeTotalLockedMexStakedUSD());

        if (farmsAddresses()[5] !== undefined) {
            promises.push(
                this.farmCompute
                    .useCompute(farmsAddresses()[5])
                    .computeFarmLockedValueUSD(farmsAddresses()[5]),
            );
        }
        if (farmsAddresses()[13] !== undefined) {
            promises.push(
                this.farmCompute
                    .useCompute(farmsAddresses()[13])
                    .computeFarmLockedValueUSD(farmsAddresses()[13]),
            );
        }

        const lockedValuesUSD = await Promise.all([...promises]);

        for (const lockedValueUSD of lockedValuesUSD) {
            const lockedValuesUSDBig = new BigNumber(lockedValueUSD);
            totalValueLockedUSD = !lockedValuesUSDBig.isNaN()
                ? totalValueLockedUSD.plus(lockedValuesUSDBig)
                : totalValueLockedUSD;
        }

        return totalValueLockedUSD.toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneMinute() * 10,
        localTtl: Constants.oneMinute() * 5,
    })
    async totalAggregatedRewards(days: number): Promise<string> {
        return await this.computeTotalAggregatedRewards(days);
    }

    async computeTotalAggregatedRewards(days: number): Promise<string> {
        const addresses: string[] = farmsAddresses();
        const promises = addresses.map(async (farmAddress) => {
            if (
                farmType(farmAddress) === FarmRewardType.CUSTOM_REWARDS ||
                farmVersion(farmAddress) === FarmVersion.V1_2
            ) {
                return '0';
            }
            return this.farmAbi
                .useAbi(farmAddress)
                .rewardsPerBlock(farmAddress);
        });
        const farmsRewardsPerBlock = await Promise.all(promises);
        const blocksNumber = (days * 24 * 60 * 60) / 6;

        let totalAggregatedRewards = new BigNumber(0);
        for (const rewardsPerBlock of farmsRewardsPerBlock) {
            const aggregatedRewards = new BigNumber(
                rewardsPerBlock,
            ).multipliedBy(blocksNumber);
            totalAggregatedRewards =
                totalAggregatedRewards.plus(aggregatedRewards);
        }
        return totalAggregatedRewards.toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneMinute() * 10,
        localTtl: Constants.oneMinute() * 5,
    })
    async totalLockedMexStakedUSD(): Promise<string> {
        return await this.computeTotalLockedMexStakedUSD();
    }

    async computeTotalLockedMexStakedUSD(): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            scAddress.feesCollector,
        );
        const [mexTokenPrice, tokenMetadata, totalLockedTokens] =
            await Promise.all([
                this.tokenCompute.tokenPriceDerivedUSD(
                    constantsConfig.MEX_TOKEN_ID,
                ),
                this.tokenService.tokenMetadata(constantsConfig.MEX_TOKEN_ID),
                this.weeklyRewardsSplittingAbi.totalLockedTokensForWeek(
                    scAddress.feesCollector,
                    currentWeek,
                ),
            ]);

        return new BigNumber(mexTokenPrice)
            .multipliedBy(totalLockedTokens)
            .multipliedBy(`1e-${tokenMetadata.decimals}`)
            .toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneMinute() * 30,
        localTtl: Constants.oneMinute() * 10,
    })
    async feeTokenBurned(tokenID: string, time: string): Promise<string> {
        return await this.computeTokenBurned(tokenID, time, 'feeBurned');
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneMinute() * 30,
        localTtl: Constants.oneMinute() * 10,
    })
    async penaltyTokenBurned(tokenID: string, time: string): Promise<string> {
        return await this.computeTokenBurned(tokenID, time, 'penaltyBurned');
    }

    async computeTokenBurned(
        tokenID: string,
        time: string,
        metric: string,
    ): Promise<string> {
        return await this.analyticsQuery.getAggregatedValue({
            series: tokenID,
            metric,
            time,
        });
    }

    private async fiterPairsByIssuedLpToken(
        pairsAddress: string[],
    ): Promise<string[]> {
        const unfilteredPairAddresses = await Promise.all(
            pairsAddress.map(async (pairAddress) => {
                return {
                    lpTokenId: await this.pairAbi.lpTokenID(pairAddress),
                    pairAddress,
                };
            }),
        );

        return unfilteredPairAddresses
            .filter((pair) => pair.lpTokenId !== undefined)
            .map((pair) => pair.pairAddress);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneMinute() * 2,
        localTtl: Constants.oneMinute(),
    })
    async pairTradingActivity(
        pairAddress: string,
    ): Promise<TradingActivityModel[]> {
        return await this.computePairTradingActivity(pairAddress);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneMinute() * 2,
        localTtl: Constants.oneMinute(),
    })
    async tokenTradingActivity(
        tokenID: string,
    ): Promise<TradingActivityModel[]> {
        return await this.computeTokenTradingActivity(tokenID);
    }

    async determineBaseAndQuoteTokens(
        pairAddress: string,
    ): Promise<{ baseToken: string; quoteToken: string }> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();
        const commonTokens = await this.routerAbi.commonTokensForUserPairs();
        const sortedCommonTokens = commonTokens.sort((a, b) => {
            const order = ['USDC', 'EGLD'];
            const indexA = order.findIndex((token) => a.includes(token));
            const indexB = order.findIndex((token) => b.includes(token));
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        const pair = pairsMetadata.find((pair) => pair.address === pairAddress);

        for (const token of sortedCommonTokens) {
            if (pair.firstTokenID === token || pair.secondTokenID === token) {
                return {
                    baseToken: token,
                    quoteToken:
                        pair.firstTokenID === token
                            ? pair.secondTokenID
                            : pair.firstTokenID,
                };
            }
        }

        return {
            baseToken: pair.firstTokenID,
            quoteToken: pair.secondTokenID,
        };
    }

    async computePairTradingActivity(
        pairAddress: string,
    ): Promise<TradingActivityModel[]> {
        const results: TradingActivityModel[] = [];
        const events = await this.elasticEventsService.getPairTradingEvents(
            pairAddress,
        );

        const { quoteToken } = await this.determineBaseAndQuoteTokens(
            pairAddress,
        );

        for (const event of events) {
            const eventConverted = convertEventTopicsAndDataToBase64(event);
            const swapEvent = new SwapEvent(eventConverted);

            const tokenIn = swapEvent.getTokenIn();
            const tokenOut = swapEvent.getTokenOut();
            const action =
                quoteToken === tokenOut.tokenID
                    ? TradingActivityAction.BUY
                    : TradingActivityAction.SELL;

            results.push({
                hash: event.txHash,
                inputToken: {
                    tokenIdentifier: tokenIn.tokenID,
                    amount: new BigNumber(tokenIn.amount).toFixed(),
                    tokenNonce: new BigNumber(tokenIn.nonce).toNumber(),
                },
                outputToken: {
                    tokenIdentifier: tokenOut.tokenID,
                    amount: new BigNumber(tokenOut.amount).toFixed(),
                    tokenNonce: new BigNumber(tokenOut.nonce).toNumber(),
                },
                timestamp: String(event.timestamp),
                action,
            });
        }

        return results;
    }

    async computeTokenTradingActivity(
        tokenID: string,
    ): Promise<TradingActivityModel[]> {
        const filteredEvents: RawElasticEventType[] = [];
        const pairsAddresses = await this.routerAbi.pairsAddress();
        let latestTimestamp = Math.floor(Date.now() / 1000);
        const size = 50;

        const createUniqueIdentifier = (event: RawElasticEventType) => {
            return `${event.txHash}-${event.shardID}-${event.order}`;
        };

        while (filteredEvents.length < 10) {
            const events =
                await this.elasticEventsService.getTokenTradingEvents(
                    tokenID,
                    latestTimestamp,
                    size,
                );
            filteredEvents.push(
                ...events
                    .filter((event) => pairsAddresses.includes(event.address))
                    .reduce((unique, event) => {
                        const eventId = createUniqueIdentifier(event);
                        return unique.some(
                            (e) => createUniqueIdentifier(e) === eventId,
                        )
                            ? unique
                            : [...unique, event];
                    }, [] as RawElasticEventType[])
                    .slice(0, 10),
            );
            latestTimestamp = filteredEvents[0].timestamp;
            if (events.length < size) {
                break;
            }
        }

        return filteredEvents.map((event) => {
            const eventConverted = convertEventTopicsAndDataToBase64(event);
            const swapEvent = new SwapEvent(eventConverted).toJSON();

            const tokenIn = swapEvent.tokenIn;
            const tokenOut = swapEvent.tokenOut;

            const action =
                tokenID === tokenOut.tokenID
                    ? TradingActivityAction.BUY
                    : TradingActivityAction.SELL;

            return {
                hash: event.txHash,
                inputToken: new EsdtTokenPaymentModel({
                    tokenIdentifier: tokenIn.tokenID,
                    tokenNonce: tokenIn.nonce,
                    amount: tokenIn.amount,
                }),
                outputToken: new EsdtTokenPaymentModel({
                    tokenIdentifier: tokenOut.tokenID,
                    tokenNonce: tokenOut.nonce,
                    amount: tokenOut.amount,
                }),
                timestamp: String(event.timestamp),
                action,
            };
        });
    }
}
