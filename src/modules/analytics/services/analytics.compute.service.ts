import { Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { awsConfig, constantsConfig, scAddress } from 'src/config';
import { FarmRewardType, FarmVersion } from 'src/modules/farm/models/farm.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { farmsAddresses, farmType, farmVersion } from 'src/utils/farm.utils';
import { FarmComputeFactory } from 'src/modules/farm/farm.compute.factory';
import { FarmGetterFactory } from 'src/modules/farm/farm.getter.factory';
import { StakingGetterService } from '../../staking/services/staking.getter.service';
import { TokenGetterService } from '../../tokens/services/token.getter.service';
import { FeesCollectorGetterService } from '../../fees-collector/services/fees-collector.getter.service';
import {
    WeekTimekeepingGetterService
} from '../../../submodules/week-timekeeping/services/week-timekeeping.getter.service';
import {
    RemoteConfigGetterService
} from '../../remote-config/remote-config.getter.service';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';

@Injectable()
export class AnalyticsComputeService {
    constructor(
        private readonly routerGetter: RouterGetterService,
        private readonly farmGetter: FarmGetterFactory,
        private readonly farmCompute: FarmComputeFactory,
        private readonly pairGetter: PairGetterService,
        private readonly stakingGetter: StakingGetterService,
        private readonly tokenGetter: TokenGetterService,
        private readonly feesCollectorGetter: FeesCollectorGetterService,
        private readonly weekTimekeepingGetter: WeekTimekeepingGetterService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly analyticsQuery: AnalyticsQueryService,
    ) { }

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

    async computeTotalValueLockedUSD(): Promise<string> {
        const pairsAddress = await this.routerGetter.getAllPairsAddress();
        const filteredPairs = await this.fiterPairsByIssuedLpToken(
            pairsAddress,
        );

        let totalValueLockedUSD = new BigNumber(0);
        const promises = filteredPairs.map((pairAddress) =>
            this.pairGetter.getLockedValueUSD(pairAddress),
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

    async computeTotalValueStakedUSD(): Promise<string> {
        let totalValueLockedUSD = new BigNumber(0);

        const stakingAddresses = await this.remoteConfigGetterService.getStakingAddresses()
        const promises = stakingAddresses.map((stakingAddress) =>
            this.stakingGetter.getStakedValueUSD(stakingAddress)
        );

        promises.push(this.computeTotalLockedMexStakedUSD())

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

    async computeTotalAggregatedRewards(days: number): Promise<string> {
        const addresses: string[] = farmsAddresses();
        const promises = addresses.map(async (farmAddress) => {
            if (
                farmType(farmAddress) === FarmRewardType.CUSTOM_REWARDS ||
                farmVersion(farmAddress) === FarmVersion.V1_2
            ) {
                return '0';
            }
            return this.farmGetter
                .useGetter(farmAddress)
                .getRewardsPerBlock(farmAddress);
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

    async computeTotalLockedMexStakedUSD(): Promise<string> {
        const currentWeek = await this.weekTimekeepingGetter.getCurrentWeek(scAddress.feesCollector);
        const [
            mexTokenPrice,
            tokenMetadata,
            totalLockedTokens,
        ] = await Promise.all([
            this.tokenGetter.getDerivedUSD(constantsConfig.MEX_TOKEN_ID),
            this.tokenGetter.getTokenMetadata(constantsConfig.MEX_TOKEN_ID),
            this.feesCollectorGetter.totalLockedTokensForWeek(scAddress.feesCollector, currentWeek)
        ]);

        return new BigNumber(mexTokenPrice)
            .multipliedBy(totalLockedTokens)
            .multipliedBy(`1e-${tokenMetadata.decimals}`)
            .toFixed();
    }
    async computeTokenBurned(
        tokenID: string,
        time: string,
        metric: string,
    ): Promise<string> {
        return await this.analyticsQuery.getAggregatedValue({
            table: awsConfig.timestream.tableName,
            series: tokenID,
            metric,
            time,
        });
    }

    private async fiterPairsByIssuedLpToken(
        pairsAddress: string[],
    ): Promise<string[]> {

        const unfilteredPairAddresses = await Promise.all(pairsAddress.map(async pairAddress => {
            return {
                lpTokenId: await this.pairGetter.getLpTokenID(pairAddress),
                pairAddress
            };
        }));

        return unfilteredPairAddresses
            .filter(pair => pair.lpTokenId !== undefined)
            .map(pair => pair.pairAddress);
    }
}
