import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { BoostedYieldsFactors } from 'src/modules/farm/models/farm.v2.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { computeValueUSD } from 'src/utils/token.converters';
import {
    computeDistribution,
    refreshWeekStartAndEndEpochs,
} from '../../utils/rewards.compute.utils';
import { StateStore } from '../state.store';

@Injectable()
export class StakingComputeService {
    computeMissingStakingProxyFields(
        stakingProxy: StakingProxyModel,
        stateStore: StateStore,
    ): StakingProxyModel {
        const stakingFarm = stateStore.stakingFarms.get(
            stakingProxy.stakingFarmAddress,
        );

        stakingProxy.stakingMinUnboundEpochs =
            stakingFarm?.minUnboundEpochs ?? 0;

        return stakingProxy;
    }

    computeMissingStakingFarmFields(
        stakingFarm: StakingModel,
        stateStore: StateStore,
    ): StakingModel {
        refreshWeekStartAndEndEpochs(stakingFarm.time);

        stakingFarm.boosterRewards.forEach((globalInfo) => {
            if (!globalInfo.totalRewardsForWeek) {
                globalInfo.totalRewardsForWeek = [];
            }
            globalInfo.rewardsDistributionForWeek = computeDistribution(
                globalInfo.totalRewardsForWeek,
                stateStore,
            );
            globalInfo.apr = '0';
        });

        const farmingToken = stateStore.tokens.get(stakingFarm.farmingTokenId);

        stakingFarm.isProducingRewards =
            !stakingFarm.produceRewardsEnabled ||
            new BigNumber(stakingFarm.accumulatedRewards).isEqualTo(
                stakingFarm.rewardCapacity,
            )
                ? false
                : true;

        stakingFarm.rewardsPerBlockAPRBound =
            this.computeRewardsPerBlockAPRBound(
                stakingFarm.farmTokenSupply,
                stakingFarm.annualPercentageRewards,
            );

        stakingFarm.rewardsRemainingDays = this.computeRewardsRemainingDaysBase(
            stakingFarm.perBlockRewards,
            stakingFarm.rewardCapacity,
            stakingFarm.accumulatedRewards,
            stakingFarm.rewardsPerBlockAPRBound,
        );

        stakingFarm.rewardsRemainingDaysUncapped =
            this.computeRewardsRemainingDaysBase(
                stakingFarm.perBlockRewards,
                stakingFarm.rewardCapacity,
                stakingFarm.accumulatedRewards,
            );

        stakingFarm.farmingTokenPriceUSD = farmingToken.price;

        stakingFarm.stakedValueUSD = computeValueUSD(
            stakingFarm.farmTokenSupply,
            stakingFarm.farmTokenDecimals,
            stakingFarm.farmingTokenPriceUSD,
        ).toFixed();

        const rewardsAPRBounded = new BigNumber(
            stakingFarm.rewardsPerBlockAPRBound,
        ).multipliedBy(constantsConfig.BLOCKS_IN_YEAR);

        stakingFarm.apr = this.computeStakeFarmAPR(
            stakingFarm.isProducingRewards,
            stakingFarm.perBlockRewards,
            stakingFarm.farmTokenSupply,
            stakingFarm.annualPercentageRewards,
            rewardsAPRBounded,
        );

        stakingFarm.aprUncapped = this.computeStakeFarmUncappedAPR(
            stakingFarm.perBlockRewards,
            stakingFarm.farmTokenSupply,
            stakingFarm.isProducingRewards,
        );

        stakingFarm.boostedApr = this.computeBoostedAPR(
            stakingFarm.boostedYieldsRewardsPercenatage,
            stakingFarm.apr,
        );

        stakingFarm.baseApr = new BigNumber(stakingFarm.apr)
            .minus(stakingFarm.boostedApr)
            .toFixed();

        stakingFarm.maxBoostedApr = this.computeMaxBoostedApr(
            stakingFarm.baseApr,
            stakingFarm.boostedYieldsFactors,
            stakingFarm.boostedYieldsRewardsPercenatage,
        );

        stakingFarm.optimalEnergyPerStaking =
            this.calculateOptimalEnergyPerStaking(stakingFarm);

        return stakingFarm;
    }

    computeStakeFarmAPR(
        isProducingRewards: boolean,
        perBlockRewardAmount: string,
        farmTokenSupply: string,
        annualPercentageRewards: string,
        rewardsAPRBounded: BigNumber,
    ): string {
        if (!isProducingRewards) {
            return '0';
        }

        const rewardsUnboundedBig = new BigNumber(perBlockRewardAmount).times(
            constantsConfig.BLOCKS_IN_YEAR,
        );
        const stakedValueBig = new BigNumber(farmTokenSupply);

        return rewardsUnboundedBig.isLessThan(rewardsAPRBounded.integerValue())
            ? rewardsUnboundedBig.dividedBy(stakedValueBig).toFixed()
            : new BigNumber(annualPercentageRewards)
                  .dividedBy(constantsConfig.MAX_PERCENT)
                  .toFixed();
    }

    computeStakeFarmUncappedAPR(
        perBlockRewardAmount: string,
        farmTokenSupply: string,
        isProducingRewards: boolean,
    ): string {
        if (!isProducingRewards) {
            return '0';
        }

        const rewardsUnboundedBig = new BigNumber(
            perBlockRewardAmount,
        ).multipliedBy(constantsConfig.BLOCKS_IN_YEAR);

        return rewardsUnboundedBig.dividedBy(farmTokenSupply).toFixed();
    }

    computeBoostedAPR(
        boostedYieldsRewardsPercentage: number,
        apr: string,
    ): string {
        const bnBoostedRewardsPercentage = new BigNumber(
            boostedYieldsRewardsPercentage,
        )
            .dividedBy(constantsConfig.MAX_PERCENT)
            .multipliedBy(100);

        const boostedAPR = new BigNumber(apr).multipliedBy(
            bnBoostedRewardsPercentage.dividedBy(100),
        );

        return boostedAPR.toFixed();
    }

    computeMaxBoostedApr(
        baseAPR: string,
        boostedYieldsFactors: BoostedYieldsFactors,
        boostedYieldsRewardsPercentage: number,
    ): string {
        const bnRawMaxBoostedApr = new BigNumber(baseAPR)
            .multipliedBy(boostedYieldsFactors.maxRewardsFactor)
            .multipliedBy(boostedYieldsRewardsPercentage)
            .dividedBy(
                constantsConfig.MAX_PERCENT - boostedYieldsRewardsPercentage,
            );

        return bnRawMaxBoostedApr.toFixed();
    }

    computeRewardsPerBlockAPRBound(
        farmTokenSupply: string,
        annualPercentageRewards: string,
    ): string {
        return new BigNumber(farmTokenSupply)
            .multipliedBy(annualPercentageRewards)
            .dividedBy(constantsConfig.MAX_PERCENT)
            .dividedBy(constantsConfig.BLOCKS_IN_YEAR)
            .toFixed();
    }

    computeRewardsRemainingDaysBase(
        perBlockRewardAmount: string,
        rewardsCapacity: string,
        accumulatedRewards: string,
        extraRewardsAPRBoundedPerBlock?: string,
    ): number {
        const perBlockRewards = extraRewardsAPRBoundedPerBlock
            ? BigNumber.min(
                  extraRewardsAPRBoundedPerBlock,
                  perBlockRewardAmount,
              )
            : new BigNumber(perBlockRewardAmount);

        // 10 blocks per minute * 60 minutes per hour * 24 hours per day
        const blocksInDay = 10 * 60 * 24;

        return parseFloat(
            new BigNumber(rewardsCapacity)
                .minus(accumulatedRewards)
                .dividedBy(perBlockRewards)
                .dividedBy(blocksInDay)
                .toFixed(2),
        );
    }

    calculateOptimalEnergyPerStaking(stakingFarm: StakingModel): string {
        const u = stakingFarm.boostedYieldsFactors.maxRewardsFactor;
        const A = stakingFarm.boostedYieldsFactors.userRewardsFarm;
        const B = stakingFarm.boostedYieldsFactors.userRewardsEnergy;

        const currentWeekGlobalInfo = stakingFarm.boosterRewards.find(
            (item) => item.week === stakingFarm.time.currentWeek,
        );

        if (currentWeekGlobalInfo === undefined) {
            throw new Error(
                `Missing staking farm rewards global info for ${stakingFarm.address}`,
            );
        }

        const optimisationConstant = new BigNumber(u)
            .multipliedBy(new BigNumber(A).plus(B))
            .minus(A)
            .dividedBy(B);
        return optimisationConstant
            .multipliedBy(currentWeekGlobalInfo.totalEnergyForWeek)
            .dividedBy(stakingFarm.farmTokenSupply)
            .integerValue()
            .toFixed();
    }
}
