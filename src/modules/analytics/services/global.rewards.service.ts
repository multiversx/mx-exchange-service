import { Injectable, Logger } from '@nestjs/common';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { GlobalRewardsModel } from '../models/global.rewards.model';
import {
    FarmsGlobalRewards,
    FeesCollectorGlobalRewards,
    StakingGlobalRewards,
} from '../models/global.rewards.model';
import { BigNumber } from 'bignumber.js';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { StakingService } from 'src/modules/staking/services/staking.service';
import { scAddress } from 'src/config';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { farmsAddresses } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class GlobalRewardsService {
    private readonly logger = new Logger(GlobalRewardsService.name);

    constructor(
        private readonly weeklyRewardsSplitting: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        private readonly farmAbiV2: FarmAbiServiceV2,
        private readonly stakingAbi: StakingAbiService,
        private readonly tokenService: TokenService,
        private readonly pairCompute: PairComputeService,
        private readonly pairService: PairService,
        private readonly remoteConfig: RemoteConfigGetterService,
        private readonly farmFactory: FarmFactoryService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly tokenCompute: TokenComputeService,
        private readonly stakingService: StakingService,
    ) {}

    async getGlobalRewards(weekOffset: number): Promise<GlobalRewardsModel> {
        return new GlobalRewardsModel({});
    }

    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneHour() * 6,
        localTtl: Constants.oneHour() * 4,
    })
    async feesCollectorRewards(
        weekOffset: number,
    ): Promise<FeesCollectorGlobalRewards> {
        try {
            return await this.processFeesCollectorRewards(weekOffset);
        } catch (error) {
            this.logger.error(
                `Error getting fees collector rewards: ${error.message}`,
            );
            throw new Error('Error getting fees collector rewards');
        }
    }

    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneHour() * 6,
        localTtl: Constants.oneHour() * 4,
    })
    async farmRewards(weekOffset: number): Promise<FarmsGlobalRewards[]> {
        try {
            return await this.processFarmsRewards(weekOffset);
        } catch (error) {
            this.logger.error(`Error getting farms rewards: ${error.message}`);
            throw new Error('Error getting farms rewards');
        }
    }

    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneHour() * 6,
        localTtl: Constants.oneHour() * 4,
    })
    async stakingRewards(weekOffset: number): Promise<StakingGlobalRewards[]> {
        try {
            return await this.processStakingRewards(weekOffset);
        } catch (error) {
            this.logger.error(
                `Error getting staking rewards: ${error.message}`,
            );
            throw new Error('Error getting staking rewards');
        }
    }

    private async processFeesCollectorRewards(
        weekOffset: number,
    ): Promise<FeesCollectorGlobalRewards> {
        let energyRewardsUSD = new BigNumber(0);
        const feesCollectorAddress = scAddress.feesCollector;

        const currentWeek =
            await this.weeklyRewardsSplitting.lastGlobalUpdateWeek(
                feesCollectorAddress,
            );

        const targetWeek = Math.max(0, currentWeek - weekOffset);

        const weekRewardsUSD =
            await this.weeklyRewardsSplittingCompute.totalRewardsForWeekUSD(
                feesCollectorAddress,
                targetWeek,
            );

        if (weekRewardsUSD && weekRewardsUSD !== '0') {
            energyRewardsUSD = energyRewardsUSD.plus(
                new BigNumber(weekRewardsUSD),
            );
        }

        const totalRewardsUSD = energyRewardsUSD.dividedBy(0.6);

        return new FeesCollectorGlobalRewards({
            totalRewardsUSD: totalRewardsUSD.toFixed(),
            energyRewardsUSD: energyRewardsUSD.toFixed(),
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
        const allPairsTokens = [...firstTokens, ...secondTokens];

        for (let i = 0; i < farmAddresses.length; i++) {
            const farmAddress = farmAddresses[i];

            const currentWeek = await this.weekTimekeepingAbi.currentWeek(
                farmAddress,
            );
            const weekToCheck = Math.max(0, currentWeek - weekOffset);

            const rewards =
                await this.weeklyRewardsSplitting.totalRewardsForWeek(
                    farmAddress,
                    weekToCheck,
                );

            const rewardTokenIDs = rewards.map((reward) => reward.tokenID);
            const tokensMetadata = allPairsTokens.filter((token) =>
                rewardTokenIDs.includes(token.identifier),
            );

            const tokenPrices =
                await this.tokenCompute.getAllTokensPriceDerivedUSD(
                    rewardTokenIDs,
                );

            const energyRewardsUSD = rewards.reduce((acc, reward, j) => {
                const rewardTokenMetadata = tokensMetadata.find(
                    (token) => token.identifier === reward.tokenID,
                );
                const tokenDecimals = rewardTokenMetadata.decimals;
                const tokenPrice = tokenPrices[j];

                const tokenAmount = new BigNumber(reward.amount).dividedBy(
                    new BigNumber(10).pow(tokenDecimals),
                );

                const rewardUSD = tokenAmount.multipliedBy(tokenPrice);

                return acc.plus(rewardUSD);
            }, new BigNumber(0));

            const totalRewardsUSD = energyRewardsUSD.dividedBy(0.6);

            farmsData.push(
                new FarmsGlobalRewards({
                    pairAddress: pairAddresses[i],
                    firstToken: firstTokens[i],
                    secondToken: secondTokens[i],
                    totalRewardsUSD: totalRewardsUSD.toString(),
                    energyRewardsUSD: energyRewardsUSD.toString(),
                }),
            );
        }

        return farmsData;
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
            const address = stakingFarmsAddresses[i];
            const currentWeek = await this.weekTimekeepingAbi.currentWeek(
                address,
            );
            const targetWeek = Math.max(0, currentWeek - weekOffset);

            const weeklyRewards =
                await this.weeklyRewardsSplitting.totalRewardsForWeek(
                    address,
                    targetWeek,
                );

            const rewardTokenIDs = weeklyRewards.map(
                (reward) => reward.tokenID,
            );
            const allRewardsTokens =
                await this.tokenService.getAllTokensMetadata(rewardTokenIDs);

            const tokenPrices =
                await this.tokenCompute.getAllTokensPriceDerivedUSD(
                    rewardTokenIDs,
                );

            const energyRewardsUSD = weeklyRewards.reduce((acc, reward, j) => {
                const tokenMetadata = allRewardsTokens.find(
                    (token) => token.identifier === reward.tokenID,
                );
                const tokenAmount = new BigNumber(reward.amount).dividedBy(
                    new BigNumber(10).pow(tokenMetadata.decimals),
                );

                const tokenPrice = tokenPrices[j];
                const tokenValueUSD = tokenAmount.multipliedBy(tokenPrice);
                return new BigNumber(acc).plus(tokenValueUSD).toFixed();
            }, '0');

            const totalRewardsUSD = new BigNumber(energyRewardsUSD)
                .dividedBy(0.6)
                .toFixed();

            stakingRewards.push({
                farmingToken: farmingTokens[i],
                totalRewardsUSD,
                energyRewardsUSD,
            });
        }

        return stakingRewards;
    }
}
