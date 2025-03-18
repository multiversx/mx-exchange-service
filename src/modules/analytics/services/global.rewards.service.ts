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
import { StakingService } from 'src/modules/staking/services/staking.service';
import { scAddress, constantsConfig } from 'src/config';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { farmsAddresses } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants, ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { FeesCollectorAbiService } from 'src/modules/fees-collector/services/fees-collector.abi.service';

@Injectable()
export class GlobalRewardsService {
    constructor(
        private readonly weeklyRewardsSplitting: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        private readonly farmAbiV2: FarmAbiServiceV2,
        private readonly tokenService: TokenService,
        private readonly pairService: PairService,
        private readonly remoteConfig: RemoteConfigGetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly tokenCompute: TokenComputeService,
        private readonly stakingService: StakingService,
        private readonly stakingAbi: StakingAbiService,
        private readonly feesCollectorAbi: FeesCollectorAbiService,
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
        return await this.processFeesCollectorRewards(weekOffset);
    }

    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneHour() * 6,
        localTtl: Constants.oneHour() * 4,
    })
    @ErrorLoggerAsync()
    async farmRewards(weekOffset: number): Promise<FarmsGlobalRewards[]> {
        return await this.processFarmsRewards(weekOffset);
    }

    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneHour() * 6,
        localTtl: Constants.oneHour() * 4,
    })
    @ErrorLoggerAsync()
    async stakingRewards(weekOffset: number): Promise<StakingGlobalRewards[]> {
        return await this.processStakingRewards(weekOffset);
    }

    private async processFeesCollectorRewards(
        weekOffset: number,
    ): Promise<FeesCollectorGlobalRewards> {
        const feesCollectorAddress = scAddress.feesCollector;

        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            feesCollectorAddress,
        );

        const targetWeek = Math.max(0, currentWeek - weekOffset);

        const energyRewardsUSD =
            await this.weeklyRewardsSplittingCompute.totalRewardsForWeekUSD(
                feesCollectorAddress,
                targetWeek,
            );

        return new FeesCollectorGlobalRewards({
            totalRewardsUSD: energyRewardsUSD,
            energyRewardsUSD: energyRewardsUSD,
        });
    }

    private async processFarmsRewards(
        weekOffset: number,
    ): Promise<FarmsGlobalRewards[]> {
        const farmsData: FarmsGlobalRewards[] = [];
        const farmAddresses = farmsAddresses([FarmVersion.V2]);

        const pairAddresses = await this.farmAbiV2.getAllPairContractAddresses(
            farmAddresses,
        );

        const firstTokens = await this.pairService.getAllFirstTokens(
            pairAddresses,
        );
        const secondTokens = await this.pairService.getAllSecondTokens(
            pairAddresses,
        );

        // Create a deduplicated array of tokens
        const uniqueTokensMap = new Map();
        [...firstTokens, ...secondTokens].forEach((token) => {
            if (!uniqueTokensMap.has(token.identifier)) {
                uniqueTokensMap.set(token.identifier, token);
            }
        });
        const allPairsTokens = Array.from(uniqueTokensMap.values());

        for (let i = 0; i < farmAddresses.length; i++) {
            const farmReward = await this.computeSingleFarmRewards(
                farmAddresses[i],
                weekOffset,
                pairAddresses[i],
                firstTokens[i],
                secondTokens[i],
                allPairsTokens,
            );

            farmsData.push(farmReward);
        }

        return farmsData;
    }

    private async computeSingleFarmRewards(
        farmAddress: string,
        weekOffset: number,
        pairAddress: string,
        firstToken: any,
        secondToken: any,
        allPairsTokens: any[],
    ): Promise<FarmsGlobalRewards> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            farmAddress,
        );
        const targetWeek = Math.max(0, currentWeek - weekOffset);

        if (weekOffset === 0) {
            const amount = await this.farmAbiV2.accumulatedRewardsForWeek(
                farmAddress,
                targetWeek,
            );
            const mexTokenID = constantsConfig.MEX_TOKEN_ID;

            const mexMetadata = await this.tokenService.tokenMetadata(
                mexTokenID,
            );
            const mexPrice = await this.tokenCompute.tokenPriceDerivedUSD(
                mexTokenID,
            );

            const energyRewardsUSD = new BigNumber(amount)
                .dividedBy(new BigNumber(10).pow(mexMetadata.decimals))
                .multipliedBy(mexPrice)
                .toFixed();
            const totalRewardsUSD = new BigNumber(energyRewardsUSD)
                .dividedBy(0.6)
                .toFixed();

            return new FarmsGlobalRewards({
                pairAddress,
                firstToken,
                secondToken,
                totalRewardsUSD,
                energyRewardsUSD,
            });
        }

        const rewards = await this.weeklyRewardsSplitting.totalRewardsForWeek(
            farmAddress,
            targetWeek,
        );
        if (!rewards.length) {
            return new FarmsGlobalRewards({
                pairAddress,
                firstToken,
                secondToken,
                totalRewardsUSD: '0',
                energyRewardsUSD: '0',
            });
        }

        const reward = rewards[0] as EsdtTokenPayment;
        const tokenMetadata =
            allPairsTokens.find((t) => t.identifier === reward.tokenID) ||
            (await this.tokenService.tokenMetadata(reward.tokenID));

        const tokenPrice = await this.tokenCompute.tokenPriceDerivedUSD(
            reward.tokenID,
        );
        const tokenAmount = new BigNumber(reward.amount).dividedBy(
            new BigNumber(10).pow(tokenMetadata.decimals),
        );

        const energyRewardsUSD = tokenAmount.multipliedBy(tokenPrice).toFixed();
        const totalRewardsUSD = new BigNumber(energyRewardsUSD)
            .dividedBy(0.6)
            .toFixed();

        return new FarmsGlobalRewards({
            pairAddress,
            firstToken,
            secondToken,
            totalRewardsUSD,
            energyRewardsUSD,
        });
    }

    private async processStakingRewards(
        weekOffset: number,
    ): Promise<StakingGlobalRewards[]> {
        const stakingRewards: StakingGlobalRewards[] = [];
        const stakingFarmsAddresses =
            await this.remoteConfig.getStakingAddresses();

        const farmingTokens = await this.stakingService.getAllFarmingTokens(
            stakingFarmsAddresses,
        );

        for (let i = 0; i < stakingFarmsAddresses.length; i++) {
            const stakingReward = await this.computeSingleStakingRewards(
                stakingFarmsAddresses[i],
                weekOffset,
                farmingTokens[i],
            );
            stakingRewards.push(stakingReward);
        }

        return stakingRewards;
    }

    private async computeSingleStakingRewards(
        stakingAddress: string,
        weekOffset: number,
        farmingToken: EsdtToken,
    ): Promise<StakingGlobalRewards> {
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

        const tokenPrice = await this.tokenCompute.tokenPriceDerivedUSD(
            farmingToken.identifier,
        );

        const energyRewardsUSD = new BigNumber(rewardAmount)
            .dividedBy(new BigNumber(10).pow(farmingToken.decimals))
            .multipliedBy(tokenPrice)
            .toFixed();

        const totalRewardsUSD = new BigNumber(energyRewardsUSD)
            .dividedBy(0.6)
            .toFixed();

        return new StakingGlobalRewards({
            farmingToken,
            totalRewardsUSD,
            energyRewardsUSD,
        });
    }
}
