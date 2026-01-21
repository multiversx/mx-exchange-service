import { Injectable } from '@nestjs/common';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import {
    FarmsGlobalRewards,
    FeesCollectorGlobalRewards,
    StakingGlobalRewards,
} from '../models/global.rewards.model';
import { BigNumber } from 'bignumber.js';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { scAddress, constantsConfig } from 'src/config';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { farmsAddresses } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants, ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { computeValueUSD } from 'src/utils/token.converters';
import { FeesCollectorComputeService } from 'src/modules/fees-collector/services/fees-collector.compute.service';
import { PairsStateService } from 'src/modules/state/services/pairs.state.service';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { TokensStateService } from 'src/modules/state/services/tokens.state.service';

@Injectable()
export class GlobalRewardsService {
    constructor(
        private readonly weeklyRewardsSplitting: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        private readonly farmAbiV2: FarmAbiServiceV2,
        private readonly tokenService: TokenService,
        private readonly remoteConfig: RemoteConfigGetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly stakingAbi: StakingAbiService,
        private readonly feesCollectorCompute: FeesCollectorComputeService,
        private readonly pairsState: PairsStateService,
        private readonly tokensState: TokensStateService,
    ) {}

    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneHour() * 6,
        localTtl: Constants.oneHour() * 4,
    })
    @ErrorLoggerAsync()
    async feesCollectorRewards(
        weekOffset: number,
    ): Promise<FeesCollectorGlobalRewards> {
        return await this.computeFeesCollectorRewards(weekOffset);
    }

    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneHour() * 6,
        localTtl: Constants.oneHour() * 4,
    })
    @ErrorLoggerAsync()
    async farmRewards(weekOffset: number): Promise<FarmsGlobalRewards[]> {
        return await this.computeFarmsRewards(weekOffset);
    }

    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneHour() * 6,
        localTtl: Constants.oneHour() * 4,
    })
    @ErrorLoggerAsync()
    async stakingRewards(weekOffset: number): Promise<StakingGlobalRewards[]> {
        return await this.computeStakingRewards(weekOffset);
    }

    async computeFeesCollectorRewards(
        weekOffset: number,
    ): Promise<FeesCollectorGlobalRewards> {
        const feesCollectorAddress = scAddress.feesCollector;

        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            feesCollectorAddress,
        );

        const targetWeek = Math.max(0, currentWeek - weekOffset);

        let totalFeesCollectorRewardsUSD = '0';

        if (weekOffset === 0) {
            totalFeesCollectorRewardsUSD =
                await this.feesCollectorCompute.accumulatedFeesUSD(targetWeek);
        } else {
            totalFeesCollectorRewardsUSD =
                await this.weeklyRewardsSplittingCompute.totalRewardsForWeekUSD(
                    feesCollectorAddress,
                    targetWeek,
                );
        }

        return new FeesCollectorGlobalRewards({
            totalRewardsUSD: totalFeesCollectorRewardsUSD,
            energyRewardsUSD: totalFeesCollectorRewardsUSD,
        });
    }

    async computeFarmsRewards(
        weekOffset: number,
    ): Promise<FarmsGlobalRewards[]> {
        const farmsData: FarmsGlobalRewards[] = [];
        const farmAddresses = farmsAddresses([FarmVersion.V2]);

        // TODO : resolve farms from stateRPC and remove abi calls

        const pairAddresses = await this.farmAbiV2.getAllPairContractAddresses(
            farmAddresses,
        );

        const pairs = await this.pairsState.getPairsWithTokens(pairAddresses, [
            'address',
        ]);

        const mexTokenID = constantsConfig.MEX_TOKEN_ID;

        const mexToken = await this.tokenService.tokenMetadataFromState(
            mexTokenID,
            ['identifier', 'price', 'decimals'],
        );

        for (let i = 0; i < farmAddresses.length; i++) {
            const farmReward = await this.computeSingleFarmRewards(
                farmAddresses[i],
                weekOffset,
                pairs[i],
                mexToken,
            );

            farmsData.push(farmReward);
        }

        return farmsData.filter((farm) =>
            new BigNumber(farm.totalRewardsUSD).isGreaterThan(0),
        );
    }

    private async computeSingleFarmRewards(
        farmAddress: string,
        weekOffset: number,
        pair: PairModel,
        mexToken: EsdtToken,
    ): Promise<FarmsGlobalRewards> {
        const farmBoostedPercentage =
            await this.farmAbiV2.boostedYieldsRewardsPercenatage(farmAddress);

        const boostedYieldRewardsPercentage = new BigNumber(
            farmBoostedPercentage,
        )
            .dividedBy(constantsConfig.MAX_PERCENT)
            .toNumber();

        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            farmAddress,
        );
        const targetWeek = Math.max(0, currentWeek - weekOffset);

        let rewardAmount = '0';
        if (weekOffset === 0) {
            rewardAmount = await this.farmAbiV2.accumulatedRewardsForWeek(
                farmAddress,
                targetWeek,
            );
        } else {
            const rewards =
                await this.weeklyRewardsSplitting.totalRewardsForWeek(
                    farmAddress,
                    targetWeek,
                );
            rewardAmount = rewards[0]?.amount ?? '0';
        }

        const energyRewardsUSD = computeValueUSD(
            rewardAmount,
            mexToken.decimals,
            mexToken.price,
        ).toFixed();

        const totalRewardsUSD = new BigNumber(energyRewardsUSD)
            .dividedBy(boostedYieldRewardsPercentage)
            .toFixed();

        return new FarmsGlobalRewards({
            pairAddress: pair.address,
            firstToken: pair.firstToken,
            secondToken: pair.secondToken,
            totalRewardsUSD,
            energyRewardsUSD,
        });
    }

    async computeStakingRewards(
        weekOffset: number,
    ): Promise<StakingGlobalRewards[]> {
        const stakingRewards: StakingGlobalRewards[] = [];
        const stakingFarmsAddresses =
            await this.remoteConfig.getStakingAddresses();

        const farmingTokenIds = await this.stakingAbi.getAllFarmingTokensIds(
            stakingFarmsAddresses,
        );

        const farmingTokens = await this.tokensState.getTokens(farmingTokenIds);

        for (let i = 0; i < stakingFarmsAddresses.length; i++) {
            const stakingReward = await this.computeSingleStakingRewards(
                stakingFarmsAddresses[i],
                weekOffset,
                farmingTokens[i],
            );
            stakingRewards.push(stakingReward);
        }

        return stakingRewards.filter((staking) =>
            new BigNumber(staking.totalRewardsUSD).isGreaterThan(0),
        );
    }

    private async computeSingleStakingRewards(
        stakingAddress: string,
        weekOffset: number,
        farmingToken: EsdtToken,
    ): Promise<StakingGlobalRewards> {
        const stakingBoostedPercentage =
            await this.stakingAbi.boostedYieldsRewardsPercenatage(
                stakingAddress,
            );

        const boostedYieldRewardsPercentage = new BigNumber(
            stakingBoostedPercentage,
        )
            .dividedBy(constantsConfig.MAX_PERCENT)
            .toNumber();

        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            stakingAddress,
        );
        const targetWeek = Math.max(0, currentWeek - weekOffset);

        let rewardAmount = '0';

        if (weekOffset === 0) {
            rewardAmount = await this.stakingAbi.accumulatedRewardsForWeek(
                stakingAddress,
                targetWeek,
            );
        } else {
            const weeklyRewards =
                await this.weeklyRewardsSplitting.totalRewardsForWeek(
                    stakingAddress,
                    targetWeek,
                );
            rewardAmount = weeklyRewards[0]?.amount ?? '0';
        }

        if (rewardAmount === '0') {
            return new StakingGlobalRewards({
                farmingToken,
                totalRewardsUSD: '0',
                energyRewardsUSD: '0',
            });
        }

        const energyRewardsUSD = computeValueUSD(
            rewardAmount,
            farmingToken.decimals,
            farmingToken.price,
        ).toFixed();

        const totalRewardsUSD = new BigNumber(energyRewardsUSD)
            .dividedBy(boostedYieldRewardsPercentage)
            .toFixed();

        return new StakingGlobalRewards({
            farmingToken,
            totalRewardsUSD,
            energyRewardsUSD,
        });
    }
}
