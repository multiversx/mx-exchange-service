import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { FarmComputeService } from '../../base-module/services/farm.compute.service';
import BigNumber from 'bignumber.js';
import { EsdtTokenPayment } from '../../../../models/esdtTokenPayment.model';
import { PairComputeService } from '../../../pair/services/pair.compute.service';
import { TokenComputeService } from '../../../tokens/services/token.compute.service';
import { constantsConfig } from '../../../../config';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { PairService } from '../../../pair/services/pair.service';
import { ContextGetterService } from '../../../../services/context/context.getter.service';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { FarmAbiServiceV2 } from './farm.v2.abi.service';
import { FarmServiceV2 } from './farm.v2.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { CachingService } from 'src/services/caching/cache.service';
import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { IFarmComputeServiceV2 } from './interfaces';

@Injectable()
export class FarmComputeServiceV2
    extends FarmComputeService
    implements IFarmComputeServiceV2
{
    constructor(
        protected readonly farmAbi: FarmAbiServiceV2,
        @Inject(forwardRef(() => FarmServiceV2))
        protected readonly farmService: FarmServiceV2,
        protected readonly pairService: PairService,
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        private readonly cachingService: CachingService,
    ) {
        super(
            farmAbi,
            farmService,
            pairService,
            pairCompute,
            contextGetter,
            tokenCompute,
        );
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [farmTokenSupply, pairAddress] = await Promise.all([
            this.farmAbi.farmTokenSupply(farmAddress),
            this.farmAbi.pairContractAddress(farmAddress),
        ]);

        const lockedValuesUSD = await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            farmTokenSupply,
        );
        return lockedValuesUSD;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async farmBaseAPR(farmAddress: string): Promise<string> {
        return await this.computeFarmBaseAPR(farmAddress);
    }

    async computeFarmBaseAPR(farmAddress: string): Promise<string> {
        const [
            boostedYieldsRewardsPercenatage,
            totalRewardsPerYearUSD,
            farmTokenSupplyUSD,
        ] = await Promise.all([
            this.farmAbi.boostedYieldsRewardsPercenatage(farmAddress),
            this.computeAnualRewardsUSD(farmAddress),
            super.farmLockedValueUSD(farmAddress),
        ]);

        return this.computeBaseRewards(
            new BigNumber(totalRewardsPerYearUSD),
            boostedYieldsRewardsPercenatage,
        )
            .div(farmTokenSupplyUSD)
            .toFixed();
    }

    async computeFarmRewardsForPosition(
        positon: CalculateRewardsArgs,
        rewardPerShare: string,
    ): Promise<BigNumber> {
        return await super.computeFarmRewardsForPosition(
            positon,
            rewardPerShare,
        );
    }

    computeBaseRewards(
        totalFarmRewards: BigNumber,
        boostedYieldsRewardsPercenatage: number,
    ): BigNumber {
        const boostedYieldsRewardsPercenatageBig = new BigNumber(
            boostedYieldsRewardsPercenatage,
        );

        if (boostedYieldsRewardsPercenatageBig.isPositive()) {
            const boosterFarmRewardsCut = totalFarmRewards
                .multipliedBy(boostedYieldsRewardsPercenatageBig)
                .dividedBy(constantsConfig.MAX_PERCENT);
            return totalFarmRewards.minus(boosterFarmRewardsCut);
        }
        return totalFarmRewards;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async userRewardsDistributionForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        liquidity: string,
    ): Promise<TokenDistributionModel[]> {
        return await this.cachingService.getOrSet(
            `farm.userRewardsDistributionForWeek.${scAddress}.${userAddress}.${week}`,
            () =>
                this.computeUserRewardsDistributionForWeek(
                    scAddress,
                    userAddress,
                    week,
                    liquidity,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async computeUserRewardsDistributionForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        liquidity: string,
    ): Promise<TokenDistributionModel[]> {
        const userRewardsForWeek = await this.userRewardsForWeek(
            scAddress,
            userAddress,
            week,
            liquidity,
        );
        return await this.weeklyRewardsSplittingCompute.computeDistribution(
            userRewardsForWeek,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async userAccumulatedRewards(
        scAddress: string,
        userAddress: string,
        week: number,
        liquidity: string,
    ): Promise<string> {
        return await this.cachingService.getOrSet(
            `farm.userAccumulatedRewards.${scAddress}.${userAddress}.${week}`,
            () =>
                this.computeUserAccumulatedRewards(
                    scAddress,
                    userAddress,
                    week,
                    liquidity,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async computeUserAccumulatedRewards(
        scAddress: string,
        userAddress: string,
        week: number,
        liquidity: string,
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
        ] = await Promise.all([
            this.farmAbi.boostedYieldsFactors(scAddress),
            this.farmAbi.boostedYieldsRewardsPercenatage(scAddress),
            this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                scAddress,
                userAddress,
                week,
            ),
            this.farmAbi.accumulatedRewardsForWeek(scAddress, week),
            this.farmAbi.rewardsPerBlock(scAddress),
            this.farmAbi.farmTokenSupply(scAddress),
            this.weeklyRewardsSplittingAbi.totalEnergyForWeek(scAddress, week),
            this.computeBlocksInWeek(scAddress, week),
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
    async userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        liquidity: string,
    ): Promise<EsdtTokenPayment[]> {
        return await this.cachingService.getOrSet(
            `farm.userRewardsForWeek.${scAddress}.${userAddress}.${week}`,
            () =>
                this.computeUserRewardsForWeek(
                    scAddress,
                    userAddress,
                    week,
                    liquidity,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async computeUserRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        liquidity: string,
    ): Promise<EsdtTokenPayment[]> {
        const payments: EsdtTokenPayment[] = [];
        const [totalRewardsForWeek, userEnergyForWeek, totalEnergyForWeek] =
            await Promise.all([
                this.weeklyRewardsSplittingAbi.totalRewardsForWeek(
                    scAddress,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                    scAddress,
                    userAddress,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.totalEnergyForWeek(
                    scAddress,
                    week,
                ),
            ]);

        const boostedYieldsFactors = await this.farmAbi.boostedYieldsFactors(
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
            this.farmAbi.rewardsPerBlock(scAddress),
            this.farmAbi.farmTokenSupply(scAddress),
            this.farmAbi.boostedYieldsRewardsPercenatage(scAddress),
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
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async optimalEnergyPerLP(scAddress: string, week: number): Promise<string> {
        return await this.computeOptimalEnergyPerLP(scAddress, week);
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
    async computeOptimalEnergyPerLP(
        scAddress: string,
        week: number,
    ): Promise<string> {
        const [factors, farmSupply, energySupply] = await Promise.all([
            this.farmAbi.boostedYieldsFactors(scAddress),
            this.farmAbi.farmTokenSupply(scAddress),
            this.weeklyRewardsSplittingAbi.totalEnergyForWeek(scAddress, week),
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
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
            this.farmAbi.undistributedBoostedRewards(scAddress),
            this.farmAbi.lastUndistributedBoostedRewardsCollectWeek(scAddress),
        ]);

        const firstWeek = lastUndistributedBoostedRewardsCollectWeek + 1;
        const lastWeek = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS - 1;
        if (firstWeek > lastWeek) {
            return new BigNumber(undistributedBoostedRewards);
        }
        const promises = [];
        for (let week = firstWeek; week <= lastWeek; week++) {
            promises.push(
                this.farmAbi.remainingBoostedRewardsToDistribute(
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

    async computeBlocksInWeek(
        scAddress: string,
        week: number,
    ): Promise<number> {
        const [startEpochForCurrentWeek, currentEpoch] = await Promise.all([
            this.weekTimekeepingCompute.startEpochForWeek(scAddress, week),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const promises = [];
        for (
            let epoch = startEpochForCurrentWeek;
            epoch <= currentEpoch;
            epoch++
        ) {
            promises.push(this.contextGetter.getBlocksCountInEpoch(epoch, 1));
        }

        const blocksInEpoch = await Promise.all(promises);
        return blocksInEpoch.reduce((total, current) => {
            return total + current;
        });
    }
}
