import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { FarmModel } from 'src/modules/farm/models/farm.v2.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { computeValueUSD } from 'src/utils/token.converters';
import {
    computeBaseRewards,
    computeDistribution,
    refreshWeekStartAndEndEpochs,
} from '../../utils/rewards.compute.utils';

@Injectable()
export class FarmComputeService {
    computeMissingFarmFields(
        farm: FarmModel,
        pairs: Map<string, PairModel>,
        tokens: Map<string, EsdtToken>,
    ): FarmModel {
        refreshWeekStartAndEndEpochs(farm.time);

        farm.boosterRewards.forEach((globalInfo) => {
            if (!globalInfo.totalRewardsForWeek) {
                globalInfo.totalRewardsForWeek = [];
            }
            globalInfo.rewardsDistributionForWeek = computeDistribution(
                globalInfo.totalRewardsForWeek,
                tokens,
            );
            globalInfo.apr = '0';
        });

        const pair = pairs.get(farm.pairAddress);
        const farmedToken = tokens.get(farm.farmedTokenId);

        farm.farmedTokenPriceUSD = farmedToken.price;
        farm.farmingTokenPriceUSD = pair.liquidityPoolTokenPriceUSD;
        farm.farmTokenPriceUSD = pair.liquidityPoolTokenPriceUSD;

        farm.totalValueLockedUSD = computeValueUSD(
            farm.farmTokenSupply,
            farm.farmTokenDecimals,
            farm.farmTokenPriceUSD,
        ).toFixed();

        const totalRewardsPerYear = new BigNumber(farm.perBlockRewards)
            .multipliedBy(constantsConfig.BLOCKS_IN_YEAR)
            .toFixed();

        const totalRewardsPerYearUSD = computeValueUSD(
            totalRewardsPerYear,
            farmedToken.decimals,
            farmedToken.price,
        );

        const baseApr = computeBaseRewards(
            totalRewardsPerYearUSD,
            farm.boostedYieldsRewardsPercenatage,
        ).div(farm.totalValueLockedUSD);

        farm.baseApr = baseApr.toFixed();
        farm.boostedApr = baseApr
            .multipliedBy(farm.boostedYieldsFactors.maxRewardsFactor)
            .multipliedBy(farm.boostedYieldsRewardsPercenatage)
            .dividedBy(
                constantsConfig.MAX_PERCENT -
                    farm.boostedYieldsRewardsPercenatage,
            )
            .toFixed();

        farm.boostedRewardsPerWeek = this.calculateBoostedRewardsPerWeek(farm);
        farm.optimalEnergyPerLp = this.calculateOptimalEnergyPerLP(farm);

        return farm;
    }

    calculateBoostedRewardsPerWeek(farm: FarmModel): string {
        const blocksInWeek = 14440 * 7;
        const totalRewardsPerWeek = new BigNumber(
            farm.perBlockRewards,
        ).multipliedBy(blocksInWeek);

        return totalRewardsPerWeek
            .multipliedBy(farm.boostedYieldsRewardsPercenatage)
            .dividedBy(constantsConfig.MAX_PERCENT)
            .integerValue()
            .toFixed();
    }

    calculateOptimalEnergyPerLP(farm: FarmModel): string {
        const u = farm.boostedYieldsFactors.maxRewardsFactor;
        const A = farm.boostedYieldsFactors.userRewardsFarm;
        const B = farm.boostedYieldsFactors.userRewardsEnergy;

        const currentWeekGlobalInfo = farm.boosterRewards.find(
            (item) => item.week === farm.time.currentWeek,
        );

        if (currentWeekGlobalInfo === undefined) {
            throw new Error(
                `Missing farm rewards global info for ${farm.address}`,
            );
        }

        const optimisationConstant = new BigNumber(u)
            .multipliedBy(new BigNumber(A).plus(B))
            .minus(A)
            .dividedBy(B);
        return optimisationConstant
            .multipliedBy(currentWeekGlobalInfo.totalEnergyForWeek)
            .dividedBy(farm.farmTokenSupply)
            .integerValue()
            .toFixed();
    }
}
