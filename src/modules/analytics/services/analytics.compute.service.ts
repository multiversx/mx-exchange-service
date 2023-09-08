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
                this.tokenService.getTokenMetadata(
                    constantsConfig.MEX_TOKEN_ID,
                ),
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
}
