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
import { OhlcvDataModel, TokenCandlesModel } from '../models/analytics.model';
import moment from 'moment';

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

    @ErrorLoggerAsync()
    async tokensLast7dPrice(
        identifiers: string[],
    ): Promise<TokenCandlesModel[]> {
        return await this.computeTokensLast7dPrice(identifiers);
    }

    async computeTokensLast7dPrice(
        identifiers: string[],
    ): Promise<TokenCandlesModel[]> {
        const endDate = moment().unix();
        const startDate = moment().subtract(7, 'days').startOf('hour').unix();

        const tokenCandles = await this.analyticsQuery.getCandlesForTokens({
            identifiers,
            start: startDate,
            end: endDate,
            resolution: '4 hours',
        });

        const tokensNeedingGapfilling = [];
        for (let i = 0; i < identifiers.length; i++) {
            const tokenID = identifiers[i];

            const tokenData = tokenCandles.find(
                (elem) => elem.identifier === tokenID,
            );

            if (!tokenData) {
                tokensNeedingGapfilling.push(tokenID);
                continue;
            }

            const needsGapfilling = tokenData.candles.some((candle) =>
                candle.ohlcv.includes(-1),
            );

            if (needsGapfilling) {
                tokensNeedingGapfilling.push(tokenID);
            }
        }

        if (tokensNeedingGapfilling.length === 0) {
            return tokenCandles;
        }

        const earliestStartDate =
            await this.analyticsQuery.getEarliestStartDate(
                tokensNeedingGapfilling,
            );

        // No activity for any of the tokens -> gapfill with 0 candles for all tokens
        if (!earliestStartDate) {
            tokensNeedingGapfilling.forEach((tokenID) => {
                let missingTokenData = new TokenCandlesModel({
                    identifier: tokenID,
                    candles: [],
                });

                missingTokenData = this.gapfillTokenCandles(
                    missingTokenData,
                    startDate,
                    endDate,
                    4,
                    [0, 0, 0, 0],
                );
                tokenCandles.push(missingTokenData);
            });

            return tokenCandles;
        }

        const lastCandles = await this.analyticsQuery.getLastCandleForTokens({
            identifiers: tokensNeedingGapfilling,
            start: moment(earliestStartDate).utc().unix(),
            end: startDate,
        });

        const result: TokenCandlesModel[] = [];

        for (let i = 0; i < identifiers.length; i++) {
            const tokenID = identifiers[i];

            let tokenData = tokenCandles.find(
                (elem) => elem.identifier === tokenID,
            );

            const lastCandle = lastCandles.find(
                (elem) => elem.identifier === tokenID,
            );

            const gapfillOhlc = !lastCandle
                ? [0, 0, 0, 0]
                : lastCandle.candles[0].ohlcv;

            if (!tokenData) {
                tokenData = new TokenCandlesModel({
                    identifier: tokenID,
                    candles: [],
                });
            }

            tokenData = this.gapfillTokenCandles(
                tokenData,
                startDate,
                endDate,
                4,
                gapfillOhlc,
            );

            result.push(tokenData);
        }

        return result;
    }

    private gapfillTokenCandles(
        tokenData: TokenCandlesModel,
        startTimestamp: number,
        endTimestamp: number,
        hoursResolution: number,
        gapfillOhlc: number[],
    ): TokenCandlesModel {
        if (tokenData.candles.length === 0) {
            const intervalTimestamps = this.generateTimestampsForHoursInterval(
                startTimestamp,
                endTimestamp,
                hoursResolution,
            );
            intervalTimestamps.forEach((timestamp) => {
                tokenData.candles.push(
                    new OhlcvDataModel({
                        time: (timestamp * 1000).toString(),
                        ohlcv: [
                            gapfillOhlc[0],
                            gapfillOhlc[1],
                            gapfillOhlc[2],
                            gapfillOhlc[3],
                            0,
                        ],
                    }),
                );
            });

            return tokenData;
        }

        const needsGapfilling = tokenData.candles.some((candle) =>
            candle.ohlcv.includes(-1),
        );

        if (!needsGapfilling) {
            return tokenData;
        }

        for (let i = 0; i < tokenData.candles.length; i++) {
            if (!tokenData.candles[i].ohlcv.includes(-1)) {
                continue;
            }

            tokenData.candles[i].ohlcv = [
                gapfillOhlc[0],
                gapfillOhlc[1],
                gapfillOhlc[2],
                gapfillOhlc[3],
                0,
            ];
        }

        return tokenData;
    }

    private generateTimestampsForHoursInterval(
        startTimestamp: number,
        endTimestamp: number,
        intervalHours: number,
    ): number[] {
        const timestamps: number[] = [];

        let start = moment.unix(startTimestamp);
        const end = moment.unix(endTimestamp);

        // Align the start time with the next 4-hour boundary
        const remainder = start.hour() % intervalHours;
        if (remainder !== 0) {
            start = start
                .add(intervalHours - remainder, 'hours')
                .startOf('hour');
        } else {
            start = start.startOf('hour'); // Align exactly to the hour if already aligned
        }

        // Generate timestamps at the specified interval until we reach the end time
        while (start.isSameOrBefore(end)) {
            timestamps.push(start.unix()); // Store the Unix timestamp
            start = start.add(intervalHours, 'hours'); // Add the interval
        }

        return timestamps;
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
}
