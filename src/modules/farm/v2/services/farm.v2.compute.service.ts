import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { FarmComputeService } from '../../base-module/services/farm.compute.service';
import BigNumber from 'bignumber.js';
import { WeeklyRewardsSplittingComputeService } from '../../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { Mixin } from 'ts-mixer';
import { EsdtTokenPayment } from '../../../../models/esdtTokenPayment.model';
import { FarmGetterServiceV2 } from './farm.v2.getter.service';
import { PairComputeService } from '../../../pair/services/pair.compute.service';
import { TokenComputeService } from '../../../tokens/services/token.compute.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { constantsConfig } from '../../../../config';
import { WeekTimekeepingGetterService } from '../../../../submodules/week-timekeeping/services/week-timekeeping.getter.service';
import { WeekTimekeepingComputeService } from '../../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingGetterService } from '../../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import { ProgressComputeService } from '../../../../submodules/weekly-rewards-splitting/services/progress.compute.service';
import { EnergyGetterService } from '../../../energy/services/energy.getter.service';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { PairService } from '../../../pair/services/pair.service';
import { PairGetterService } from '../../../pair/services/pair.getter.service';
import { ContextGetterService } from '../../../../services/context/context.getter.service';

@Injectable()
export class FarmComputeServiceV2 extends Mixin(
    FarmComputeService,
    WeeklyRewardsSplittingComputeService,
) {
    constructor(
        @Inject(forwardRef(() => FarmGetterServiceV2))
        protected readonly farmGetter: FarmGetterServiceV2,
        protected readonly weekTimekeepingGetter: WeekTimekeepingGetterService,
        protected readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        @Inject(forwardRef(() => WeeklyRewardsSplittingGetterService))
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
        protected readonly progressCompute: ProgressComputeService,
        protected readonly pairCompute: PairComputeService,
        protected readonly energyGetter: EnergyGetterService,
        protected readonly tokenCompute: TokenComputeService,
        protected readonly pairService: PairService,
        protected readonly pairGetter: PairGetterService,
        protected readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(
            weekTimekeepingGetter,
            weekTimekeepingCompute,
            weeklyRewardsSplittingGetter,
            progressCompute,
            pairCompute,
            energyGetter,
            tokenCompute,
        );
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [farmTokenSupply, pairAddress] = await Promise.all([
            this.farmGetter.getFarmTokenSupply(farmAddress),
            this.farmGetter.getPairContractManagedAddress(farmAddress),
        ]);

        const lockedValuesUSD = await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            farmTokenSupply,
        );
        return lockedValuesUSD;
    }

    async computeFarmBaseAPR(farmAddress: string): Promise<string> {
        const [
            farmedTokenID,
            farmingTokenID,
            boostedYieldsRewardsPercenatage,
            totalRewardsPerYearUSD,
            farmTokenSupplyUSD,
        ] = await Promise.all([
            this.farmGetter.getFarmedTokenID(farmAddress),
            this.farmGetter.getFarmingTokenID(farmAddress),
            this.farmGetter.getBoostedYieldsRewardsPercenatage(farmAddress),
            this.computeAnualRewardsUSD(farmAddress),
            this.farmGetter.getTotalValueLockedUSD(farmAddress),
        ]);

        const apr = this.computeBaseRewards(
            new BigNumber(totalRewardsPerYearUSD),
            boostedYieldsRewardsPercenatage,
        ).div(farmTokenSupplyUSD);

        let feesAPR: BigNumber = new BigNumber(0);
        if (farmedTokenID !== farmingTokenID) {
            const pairAddress =
                await this.pairService.getPairAddressByLpTokenID(
                    farmingTokenID,
                );

            feesAPR = pairAddress
                ? new BigNumber(await this.pairGetter.getFeesAPR(pairAddress))
                : new BigNumber(0);
        }
        return feesAPR.isNaN() ? apr.toFixed() : apr.plus(feesAPR).toFixed();
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

    async computeUserAccumulatedRewards(
        scAddress: string,
        week: number,
        userAddress: string,
        liquidity: string,
    ): Promise<string> {
        const [
            boostedYieldsFactors,
            userEnergy,
            totalRewards,
            rewardsPerBlock,
            farmTokenSupply,
            totalEnergy,
            blocksInWeek,
        ] = await Promise.all([
            this.farmGetter.getBoostedYieldsFactors(scAddress),
            this.farmGetter.userEnergyForWeek(
                scAddress,
                userAddress,
                week,
            ),
            this.farmGetter.getAccumulatedRewardsForWeek(
                scAddress,
                week,
            ),
            this.farmGetter.getRewardsPerBlock(scAddress),
            this.farmGetter.getFarmTokenSupply(scAddress),
            this.farmGetter.totalEnergyForWeek(
                scAddress,
                week,
            ),
            this.computeBlocksInWeek(scAddress, week),
        ])

        const energyAmount = userEnergy.amount;

        const userHasMinEnergy = new BigNumber(energyAmount).isGreaterThan(
            boostedYieldsFactors.minEnergyAmount,
        );
        if (!userHasMinEnergy) {
            return "0";
        }

        const userMinFarmAmount = new BigNumber(liquidity).isGreaterThan(
            boostedYieldsFactors.minFarmAmount,
        );
        if (!userMinFarmAmount) {
            return "0";
        }

        if (totalRewards.length === 0) {
            return "0";
        }

        const userBaseRewardsPerBlock = new BigNumber(rewardsPerBlock)
            .multipliedBy(liquidity)
            .dividedBy(farmTokenSupply);
        const userRewardsForWeek = new BigNumber(
            boostedYieldsFactors.maxRewardsFactor,
        )
            .multipliedBy(userBaseRewardsPerBlock)
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

    async computeUserRewardsForWeek(
        scAddress: string,
        week: number,
        userAddress: string,
        energyAmount: string,
        liquidity: string,
    ): Promise<EsdtTokenPayment[]> {
        const payments: EsdtTokenPayment[] = [];

        const boostedYieldsFactors =
            await this.farmGetter.getBoostedYieldsFactors(scAddress);

        if (energyAmount === undefined) {
            const userEnergyModel =
                await this.weeklyRewardsSplittingGetter.userEnergyForWeek(
                    scAddress,
                    userAddress,
                    week,
                );
            energyAmount = userEnergyModel.amount;
        }

        const userHasMinEnergy = new BigNumber(energyAmount).isGreaterThan(
            boostedYieldsFactors.minEnergyAmount,
        );
        if (!userHasMinEnergy) {
            return payments;
        }

        const userMinFarmAmount = new BigNumber(liquidity).isGreaterThan(
            boostedYieldsFactors.minFarmAmount,
        );
        if (!userMinFarmAmount) {
            return payments;
        }

        const totalRewards =
            await this.weeklyRewardsSplittingGetter.totalRewardsForWeek(
                scAddress,
                week,
            );
        if (totalRewards.length === 0) {
            return payments;
        }

        const [
            rewardsPerBlock,
            farmTokenSupply,
            boostedYieldsRewardsPercenatage,
            totalEnergy,
            userEnergy] =
            await Promise.all([
                this.farmGetter.getRewardsPerBlock(scAddress),
                this.farmGetter.getFarmTokenSupply(scAddress),
                this.farmGetter.getBoostedYieldsRewardsPercenatage(scAddress),
                this.weeklyRewardsSplittingGetter.totalEnergyForWeek(
                    scAddress,
                    week,
                ),
                this.weeklyRewardsSplittingGetter.userEnergyForWeek(
                    scAddress,
                    userAddress,
                    week,
                ),
            ]);

        const userBaseRewardsPerBlock = new BigNumber(rewardsPerBlock)
            .multipliedBy(boostedYieldsRewardsPercenatage)
            .dividedBy(constantsConfig.MAX_PERCENT)
            .multipliedBy(liquidity)
            .dividedBy(farmTokenSupply);

        const userRewardsForWeek = new BigNumber(boostedYieldsFactors.maxRewardsFactor)
            .multipliedBy(userBaseRewardsPerBlock)
            .multipliedBy(constantsConfig.BLOCKS_PER_WEEK);

        for (const weeklyRewards of totalRewards) {
            const boostedRewardsByEnergy = new BigNumber(weeklyRewards.amount)
                .multipliedBy(boostedYieldsFactors.userRewardsEnergy)
                .multipliedBy(userEnergy.amount)
                .dividedBy(totalEnergy);

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

    // The boosted rewards is min(MAX_REWARDS, COMPUTED_REWARDS)
    // MAX_REWARDS = MAX_REWARDS_FACTOR * WEEKLY_REWARDS * USER_FARM_AMOUNT / FARM_SUPPLY
    //
    // COMPUTED_REWARDS =  WEEKLY_REWARDS *
    //    (USER_ENERGY_CONS * USER_ENERGY / TOTAL_ENERGY + USER_FARM_CONST * USER_FARM_AMOUNT / FARM_SUPPLY)
    //    / (USER_ENERGY_CONST + USER_FARM_CONST)
    //
    // the optimal ratio is the ration when MAX_REWARDS = COMPUTED_REWARDS
    // USER_FARM_AMOUNT / USER_ENERGY =
    // = FARM_SUPPLY * USER_ENERGY_CONST /
    // ( ENERGY_SUPPLY * (MAX_REWARDS_FACTOR * (USER_ENERGY_CONST + USER_FARM_CONST) - USER_FARM_CONST)
    async computeOptimalRatio(scAddress: string, week: number): Promise<string> {
        const [
            factors,
            farmSupply,
            energySupply,
        ] = await Promise.all([
            this.farmGetter.getBoostedYieldsFactors(scAddress),
            this.farmGetter.getFarmTokenSupply(scAddress),
            this.farmGetter.totalEnergyForWeek(scAddress, week),
        ]);

        return new BigNumber(farmSupply)
            .multipliedBy(factors.userRewardsEnergy)
            .dividedBy(energySupply)
            .dividedBy(
                new BigNumber(factors.maxRewardsFactor)
                    .multipliedBy(
                        new BigNumber(factors.userRewardsEnergy)
                            .plus(factors.userRewardsFarm)
                    )
                    .minus(factors.userRewardsFarm)
            )
            .toFixed()
    }

    async computeBlocksInWeek(scAddress: string, week: number): Promise<number> {
        const [
            startEpochForCurrentWeek,
            currentEpoch,
        ] = await Promise.all([
            this.weekTimekeepingGetter.getStartEpochForWeek(scAddress, week),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const promises = []
        for (let epoch = startEpochForCurrentWeek; epoch <= currentEpoch; epoch++) {
            promises.push(this.contextGetter.getBlocksCountInEpoch(epoch, 1));
        }

        const blocksInEpoch = await Promise.all(promises);
        return blocksInEpoch.reduce((total, current) => {
            return total + current;
        })
    }

}
