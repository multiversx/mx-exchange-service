import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { StakingTokenAttributesModel } from '../models/stakingTokenAttributes.model';
import { StakingAbiService } from './staking.abi.service';
import { StakingService } from './staking.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { denominateAmount } from 'src/utils/token.converters';
import { OptimalCompoundModel } from '../models/staking.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';

@Injectable()
export class StakingComputeService {
    constructor(
        private readonly stakingAbi: StakingAbiService,
        @Inject(forwardRef(() => StakingService))
        private readonly stakingService: StakingService,
        private readonly contextGetter: ContextGetterService,
        private readonly tokenService: TokenService,
        private readonly tokenCompute: TokenComputeService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        private readonly apiService: MXApiService,
    ) {}

    async computeStakeRewardsForPosition(
        stakeAddress: string,
        liquidity: string,
        decodedAttributes: StakingTokenAttributesModel,
    ): Promise<BigNumber> {
        const [futureRewardsPerShare, divisionSafetyConstant] =
            await Promise.all([
                this.computeFutureRewardsPerShare(stakeAddress),
                this.stakingAbi.divisionSafetyConstant(stakeAddress),
            ]);

        const amountBig = new BigNumber(liquidity);
        const futureRewardsPerShareBig = new BigNumber(futureRewardsPerShare);
        const currentRewardPerShareBig = new BigNumber(
            decodedAttributes.rewardPerShare,
        );

        const rewardPerShareDiff = futureRewardsPerShareBig.minus(
            currentRewardPerShareBig,
        );
        return amountBig
            .multipliedBy(rewardPerShareDiff)
            .dividedBy(divisionSafetyConstant);
    }

    async computeFutureRewardsPerShare(
        stakeAddress: string,
    ): Promise<BigNumber> {
        let extraRewards = await this.computeExtraRewardsSinceLastAllocation(
            stakeAddress,
        );

        const [
            accumulatedRewards,
            rewardsCapacity,
            farmRewardPerShare,
            farmTokenSupply,
            divisionSafetyConstant,
        ] = await Promise.all([
            this.stakingAbi.accumulatedRewards(stakeAddress),
            this.stakingAbi.rewardCapacity(stakeAddress),
            this.stakingAbi.rewardPerShare(stakeAddress),
            this.stakingAbi.farmTokenSupply(stakeAddress),
            this.stakingAbi.divisionSafetyConstant(stakeAddress),
        ]);

        const farmRewardPerShareBig = new BigNumber(farmRewardPerShare);
        const farmTokenSupplyBig = new BigNumber(farmTokenSupply);
        const divisionSafetyConstantBig = new BigNumber(divisionSafetyConstant);

        if (extraRewards.isGreaterThan(0)) {
            const totalRewards = extraRewards.plus(accumulatedRewards);
            if (totalRewards.isGreaterThan(rewardsCapacity)) {
                const amountOverCapacity = totalRewards.minus(rewardsCapacity);
                extraRewards = extraRewards.minus(amountOverCapacity);
            }

            return farmRewardPerShareBig.plus(
                extraRewards
                    .multipliedBy(divisionSafetyConstantBig)
                    .dividedBy(farmTokenSupplyBig),
            );
        }

        return farmRewardPerShareBig;
    }

    async computeExtraRewardsSinceLastAllocation(
        stakeAddress: string,
    ): Promise<BigNumber> {
        const [
            currentNonce,
            lastRewardBlockNonce,
            perBlockRewardAmount,
            produceRewardsEnabled,
        ] = await Promise.all([
            this.contextGetter.getShardCurrentBlockNonce(1),
            this.stakingAbi.lastRewardBlockNonce(stakeAddress),
            this.stakingAbi.perBlockRewardsAmount(stakeAddress),
            this.stakingAbi.produceRewardsEnabled(stakeAddress),
        ]);

        const currentBlockBig = new BigNumber(currentNonce);
        const lastRewardBlockNonceBig = new BigNumber(lastRewardBlockNonce);
        const perBlockRewardAmountBig = new BigNumber(perBlockRewardAmount);
        const blockDifferenceBig = currentBlockBig.minus(
            lastRewardBlockNonceBig,
        );
        if (currentNonce > lastRewardBlockNonce && produceRewardsEnabled) {
            const extraRewardsUnbounded =
                perBlockRewardAmountBig.times(blockDifferenceBig);
            const extraRewardsBounded = await this.computeExtraRewardsBounded(
                stakeAddress,
                blockDifferenceBig,
            );

            return extraRewardsUnbounded.isLessThan(extraRewardsBounded)
                ? extraRewardsUnbounded
                : extraRewardsBounded;
        }

        return new BigNumber(0);
    }

    async computeExtraRewardsBounded(
        stakeAddress: string,
        blockDifferenceBig: BigNumber,
    ): Promise<BigNumber> {
        const [farmTokenSupply, annualPercentageRewards] = await Promise.all([
            this.stakingAbi.farmTokenSupply(stakeAddress),
            this.stakingAbi.annualPercentageRewards(stakeAddress),
        ]);
        const extraRewardsAPRBoundedPerBlock = new BigNumber(farmTokenSupply)
            .multipliedBy(annualPercentageRewards)
            .dividedBy(constantsConfig.MAX_PERCENT)
            .dividedBy(constantsConfig.BLOCKS_IN_YEAR);

        return extraRewardsAPRBoundedPerBlock.multipliedBy(blockDifferenceBig);
    }

    async farmingTokenPriceUSD(stakeAddress: string): Promise<string> {
        const farmingTokenID = await this.stakingAbi.farmingTokenID(
            stakeAddress,
        );
        return await this.tokenCompute.tokenPriceDerivedUSD(farmingTokenID);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async stakedValueUSD(stakeAddress: string): Promise<string> {
        return this.computeStakedValueUSD(stakeAddress);
    }

    async computeStakedValueUSD(stakeAddress: string): Promise<string> {
        const [farmTokenSupply, farmingToken] = await Promise.all([
            this.stakingAbi.farmTokenSupply(stakeAddress),
            this.tokenService.tokenMetadata(constantsConfig.MEX_TOKEN_ID),
            this.stakingService.getFarmingToken(stakeAddress),
        ]);

        const farmingTokenPrice = await this.tokenCompute.tokenPriceDerivedUSD(
            farmingToken.identifier,
        );
        return new BigNumber(farmTokenSupply)
            .multipliedBy(farmingTokenPrice)
            .multipliedBy(`1e-${farmingToken.decimals}`)
            .toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async stakeFarmAPR(stakeAddress: string): Promise<string> {
        return await this.computeStakeFarmAPR(stakeAddress);
    }

    async computeStakeFarmAPR(stakeAddress: string): Promise<string> {
        const [
            annualPercentageRewards,
            perBlockRewardAmount,
            rewardsAPRBoundedBig,
            stakedValue,
        ] = await Promise.all([
            this.stakingAbi.annualPercentageRewards(stakeAddress),
            this.stakingAbi.perBlockRewardsAmount(stakeAddress),
            this.computeExtraRewardsBounded(
                stakeAddress,
                constantsConfig.BLOCKS_IN_YEAR,
            ),
            this.stakingAbi.farmTokenSupply(stakeAddress),
        ]);

        const rewardsUnboundedBig = new BigNumber(perBlockRewardAmount).times(
            constantsConfig.BLOCKS_IN_YEAR,
        );
        const stakedValueBig = new BigNumber(stakedValue);

        return rewardsUnboundedBig.isLessThan(
            rewardsAPRBoundedBig.integerValue(),
        )
            ? rewardsUnboundedBig.dividedBy(stakedValueBig).toFixed()
            : new BigNumber(annualPercentageRewards)
                  .dividedBy(constantsConfig.MAX_PERCENT)
                  .toFixed();
    }

    async computeRewardsRemainingDays(stakeAddress: string): Promise<number> {
        const [perBlockRewardAmount, accumulatedRewards, rewardsCapacity] =
            await Promise.all([
                this.stakingAbi.perBlockRewardsAmount(stakeAddress),
                this.stakingAbi.accumulatedRewards(stakeAddress),
                this.stakingAbi.rewardCapacity(stakeAddress),
            ]);

        // 10 blocks per minute * 60 minutes per hour * 24 hours per day
        const blocksInDay = 10 * 60 * 24;

        return parseFloat(
            new BigNumber(rewardsCapacity)
                .minus(accumulatedRewards)
                .dividedBy(perBlockRewardAmount)
                .dividedBy(blocksInDay)
                .toFixed(2),
        );
    }

    async computeOptimalCompoundFrequency(
        stakeAddress: string,
        positionAmount: string,
        timeHorizon: number,
    ): Promise<OptimalCompoundModel> {
        const [apr, farmingToken] = await Promise.all([
            this.stakeFarmAPR(stakeAddress),
            this.stakingService.getFarmingToken(stakeAddress),
        ]);

        const denominatedAmount = denominateAmount(
            positionAmount,
            farmingToken.decimals,
        ).toNumber();

        const farmingTokenPrice = await this.tokenCompute.tokenPriceDerivedEGLD(
            farmingToken.identifier,
        );
        const egldPriceFarmingToken = new BigNumber(1).dividedBy(
            farmingTokenPrice,
        );
        const transactionFeesInFarmingToken = new BigNumber(
            constantsConfig.COMPOUND_TRANSACTION_FEE,
        )
            .multipliedBy(egldPriceFarmingToken)
            .toNumber();

        // Express compound iterations in hours
        const compoundIterations = 365 * 24;

        let optimalCompoundIterations = 0;
        let optimalProfit = 0;

        for (let iterator = 1; iterator < compoundIterations; iterator += 1) {
            const rewards =
                (1 + (parseFloat(apr) * timeHorizon) / (365 * iterator)) **
                iterator;

            const finalAmount = denominatedAmount * rewards;

            const profit =
                finalAmount -
                denominatedAmount -
                transactionFeesInFarmingToken * iterator;

            if (profit > optimalProfit) {
                optimalProfit = profit;
                optimalCompoundIterations = iterator;
            } else {
                break;
            }
        }

        if (optimalCompoundIterations === 0) {
            return new OptimalCompoundModel({
                optimalProfit: 0,
                interval: 0,
                days: 0,
                hours: 0,
                minutes: 0,
            });
        }

        /*
            Compute optimal compound frequency expressed in hours and minutes:
                freqDays = (timeInterval/OptimalCompound)
                freqHours = (timeInterval*24h/OptimalCompound)
                freqMinutes = [(timeInterval*24h/OptimalCompound) - INT((timeInterval*24h/OptimalCompound))] * 60
        */
        const freqDays = timeHorizon / optimalCompoundIterations;
        const frequencyHours = (freqDays - Math.floor(freqDays)) * 24;
        const frequencyMinutes =
            (frequencyHours - Math.floor(frequencyHours)) * 60;

        return new OptimalCompoundModel({
            optimalProfit: optimalProfit,
            interval: optimalCompoundIterations,
            days: Math.floor(freqDays),
            hours: Math.floor(frequencyHours),
            minutes: Math.floor(frequencyMinutes),
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async undistributedBoostedRewards(
        scAddress: string,
        currentWeek: number,
    ): Promise<string> {
        const amount = await this.undistributedBoostedRewardsRaw(
            scAddress,
            currentWeek,
        );
        return amount.integerValue().toFixed();
    }

    async undistributedBoostedRewardsRaw(
        scAddress: string,
        currentWeek: number,
    ): Promise<BigNumber> {
        const [
            undistributedBoostedRewards,
            lastUndistributedBoostedRewardsCollectWeek,
        ] = await Promise.all([
            this.stakingAbi.undistributedBoostedRewards(scAddress),
            this.stakingAbi.lastUndistributedBoostedRewardsCollectWeek(
                scAddress,
            ),
        ]);

        const firstWeek = lastUndistributedBoostedRewardsCollectWeek + 1;
        const lastWeek = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS - 1;
        if (firstWeek > lastWeek) {
            return new BigNumber(undistributedBoostedRewards);
        }
        const promises = [];
        for (let week = firstWeek; week <= lastWeek; week++) {
            promises.push(
                this.stakingAbi.remainingBoostedRewardsToDistribute(
                    scAddress,
                    week,
                ),
            );
        }
        const remainingRewards = await Promise.all(promises);
        const totalRemainingRewards = remainingRewards.reduce((acc, curr) => {
            return new BigNumber(acc).plus(curr);
        });
        return new BigNumber(undistributedBoostedRewards).plus(
            totalRemainingRewards,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async userRewardsDistributionForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<TokenDistributionModel[]> {
        return await this.computeUserRewardsDistributionForWeek(
            scAddress,
            userAddress,
            week,
        );
    }

    async computeUserRewardsDistributionForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<TokenDistributionModel[]> {
        const userRewardsForWeek = await this.userRewardsForWeek(
            scAddress,
            userAddress,
            week,
        );
        return await this.weeklyRewardsSplittingCompute.computeDistribution(
            userRewardsForWeek,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async userAccumulatedRewards(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<string> {
        return this.computeUserAccumulatedRewards(scAddress, userAddress, week);
    }

    async computeUserAccumulatedRewards(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<string> {
        const [
            boostedYieldsFactors,
            boostedYieldsRewardsPercenatage,
            userEnergy,
            totalRewards,
            rewardsPerBlock,
            farmTokenSupply,
            totalEnergy,
            blocksInWeek,
            liquidity,
        ] = await Promise.all([
            this.stakingAbi.boostedYieldsFactors(scAddress),
            this.stakingAbi.boostedYieldsRewardsPercenatage(scAddress),
            this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                scAddress,
                userAddress,
                week,
            ),
            this.stakingAbi.accumulatedRewardsForWeek(scAddress, week),
            this.stakingAbi.perBlockRewardsAmount(scAddress),
            this.stakingAbi.farmTokenSupply(scAddress),
            this.weeklyRewardsSplittingAbi.totalEnergyForWeek(scAddress, week),
            this.computeBlocksInWeek(scAddress, week),
            this.stakingAbi.userTotalStakePosition(scAddress, userAddress),
        ]);

        const energyAmount = userEnergy.amount;

        const userHasMinEnergy = new BigNumber(energyAmount).isGreaterThan(
            boostedYieldsFactors.minEnergyAmount,
        );
        if (!userHasMinEnergy) {
            return '0';
        }

        const userMinFarmAmount = new BigNumber(liquidity).isGreaterThan(
            boostedYieldsFactors.minFarmAmount,
        );
        if (!userMinFarmAmount) {
            return '0';
        }

        if (totalRewards.length === 0) {
            return '0';
        }

        const userMaxBoostedRewardsPerBlock = new BigNumber(rewardsPerBlock)
            .multipliedBy(boostedYieldsRewardsPercenatage)
            .dividedBy(constantsConfig.MAX_PERCENT)
            .multipliedBy(liquidity)
            .dividedBy(farmTokenSupply);

        const userRewardsForWeek = new BigNumber(
            boostedYieldsFactors.maxRewardsFactor,
        )
            .multipliedBy(userMaxBoostedRewardsPerBlock)
            .multipliedBy(blocksInWeek);

        const boostedRewardsByEnergy = new BigNumber(totalRewards)
            .multipliedBy(boostedYieldsFactors.userRewardsEnergy)
            .multipliedBy(userEnergy.amount)
            .dividedBy(totalEnergy);

        const boostedRewardsByTokens = new BigNumber(totalRewards)
            .multipliedBy(boostedYieldsFactors.userRewardsFarm)
            .multipliedBy(liquidity)
            .dividedBy(farmTokenSupply);

        const constantsBase = new BigNumber(
            boostedYieldsFactors.userRewardsEnergy,
        ).plus(boostedYieldsFactors.userRewardsFarm);

        const boostedRewardAmount = boostedRewardsByEnergy
            .plus(boostedRewardsByTokens)
            .dividedBy(constantsBase);

        const paymentAmount =
            boostedRewardAmount.comparedTo(userRewardsForWeek) < 1
                ? boostedRewardAmount
                : userRewardsForWeek;

        return paymentAmount.integerValue().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]> {
        return this.computeUserRewardsForWeek(scAddress, userAddress, week);
    }

    async computeUserRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]> {
        const payments: EsdtTokenPayment[] = [];
        const [
            totalRewardsForWeek,
            userEnergyForWeek,
            totalEnergyForWeek,
            liquidity,
        ] = await Promise.all([
            this.weeklyRewardsSplittingAbi.totalRewardsForWeek(scAddress, week),
            this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                scAddress,
                userAddress,
                week,
            ),
            this.weeklyRewardsSplittingAbi.totalEnergyForWeek(scAddress, week),
            this.stakingAbi.userTotalStakePosition(scAddress, userAddress),
        ]);

        const boostedYieldsFactors = await this.stakingAbi.boostedYieldsFactors(
            scAddress,
        );

        const userHasMinEnergy = new BigNumber(
            userEnergyForWeek.amount,
        ).isGreaterThan(boostedYieldsFactors.minEnergyAmount);
        if (!userHasMinEnergy) {
            return payments;
        }

        const userMinFarmAmount = new BigNumber(liquidity).isGreaterThan(
            boostedYieldsFactors.minFarmAmount,
        );
        if (!userMinFarmAmount) {
            return payments;
        }

        if (totalRewardsForWeek.length === 0) {
            return payments;
        }

        const [
            rewardsPerBlock,
            farmTokenSupply,
            boostedYieldsRewardsPercenatage,
        ] = await Promise.all([
            this.stakingAbi.perBlockRewardsAmount(scAddress),
            this.stakingAbi.farmTokenSupply(scAddress),
            this.stakingAbi.boostedYieldsRewardsPercenatage(scAddress),
        ]);

        const userMaxBoostedRewardsPerBlock = new BigNumber(rewardsPerBlock)
            .multipliedBy(boostedYieldsRewardsPercenatage)
            .dividedBy(constantsConfig.MAX_PERCENT)
            .multipliedBy(liquidity)
            .dividedBy(farmTokenSupply);

        const userRewardsForWeek = new BigNumber(
            boostedYieldsFactors.maxRewardsFactor,
        )
            .multipliedBy(userMaxBoostedRewardsPerBlock)
            .multipliedBy(constantsConfig.BLOCKS_PER_WEEK);

        for (const weeklyRewards of totalRewardsForWeek) {
            const boostedRewardsByEnergy = new BigNumber(weeklyRewards.amount)
                .multipliedBy(boostedYieldsFactors.userRewardsEnergy)
                .multipliedBy(userEnergyForWeek.amount)
                .dividedBy(totalEnergyForWeek);

            const boostedRewardsByTokens = new BigNumber(weeklyRewards.amount)
                .multipliedBy(boostedYieldsFactors.userRewardsFarm)
                .multipliedBy(liquidity)
                .dividedBy(farmTokenSupply);

            const constantsBase = new BigNumber(
                boostedYieldsFactors.userRewardsEnergy,
            ).plus(boostedYieldsFactors.userRewardsFarm);

            const boostedRewardAmount = boostedRewardsByEnergy
                .plus(boostedRewardsByTokens)
                .dividedBy(constantsBase);

            const paymentAmount =
                boostedRewardAmount.comparedTo(userRewardsForWeek) < 1
                    ? boostedRewardAmount
                    : userRewardsForWeek;
            if (paymentAmount.isPositive()) {
                const payment = new EsdtTokenPayment();
                payment.amount = paymentAmount.integerValue().toFixed();
                payment.nonce = 0;
                payment.tokenID = weeklyRewards.tokenID;
                payment.tokenType = weeklyRewards.tokenType;
                payments.push(payment);
            }
        }

        return payments;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async optimalEnergyPerStaking(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return await this.computeOptimalEnergyPerStaking(scAddress, week);
    }

    //
    // The boosted rewards is min(MAX_REWARDS, COMPUTED_REWARDS)
    //
    //                    USER_FARM_AMOUNT
    // MAX_REWARDS = u * ------------------
    //                      FARM_SUPPLY
    //
    //                       A        USER_FARM_AMOUNT        B        USER_ENERGY_AMOUNT
    //  COMPUTED_REWARDS = -----  *  ------------------  +  -----  *  --------------------
    //                     A + B        FARM_SUPPLY         A + B         TOTAL_ENERGY
    //
    //
    // the optimal ratio is the ration when MAX_REWARDS = COMPUTED_REWARDS, which gives the following formula:
    //
    //     USER_ENERGY        u * (A + B) - A      TOTAL_ENERGY
    // ------------------ =  ----------------- *  --------------
    //  USER_FARM_AMOUNT             B             FARM_SUPPLY
    //
    async computeOptimalEnergyPerStaking(
        stakingAddress: string,
        week: number,
    ): Promise<string> {
        const [factors, farmSupply, energySupply] = await Promise.all([
            this.stakingAbi.boostedYieldsFactors(stakingAddress),
            this.stakingAbi.farmTokenSupply(stakingAddress),
            this.weeklyRewardsSplittingAbi.totalEnergyForWeek(
                stakingAddress,
                week,
            ),
        ]);

        const u = factors.maxRewardsFactor;
        const A = factors.userRewardsFarm;
        const B = factors.userRewardsEnergy;

        const optimisationConstant = new BigNumber(u)
            .multipliedBy(new BigNumber(A).plus(B))
            .minus(A)
            .dividedBy(B);
        return optimisationConstant
            .multipliedBy(energySupply)
            .dividedBy(farmSupply)
            .integerValue()
            .toFixed();
    }

    async computeBlocksInWeek(
        scAddress: string,
        week: number,
    ): Promise<number> {
        const [startEpochForCurrentWeek, currentEpoch, shardID] =
            await Promise.all([
                this.weekTimekeepingCompute.startEpochForWeek(scAddress, week),
                this.contextGetter.getCurrentEpoch(),
                this.stakingAbi.stakingShard(scAddress),
            ]);

        const promises = [];
        for (
            let epoch = startEpochForCurrentWeek;
            epoch <= currentEpoch;
            epoch++
        ) {
            promises.push(
                this.contextGetter.getBlocksCountInEpoch(epoch, shardID),
            );
        }

        const blocksInEpoch = await Promise.all(promises);
        return blocksInEpoch.reduce((total, current) => {
            return total + current;
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async deployedAt(stakeAddress: string): Promise<number> {
        return await this.computeDeployedAt(stakeAddress);
    }

    async computeDeployedAt(stakeAddress: string): Promise<number> {
        const { deployedAt } = await this.apiService.getAccountStats(
            stakeAddress,
        );
        return deployedAt ?? undefined;
    }
}
