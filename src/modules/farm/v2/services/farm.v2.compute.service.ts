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
            this.computeFarmedTokenPriceUSD(farmAddress),
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

        const [rewardsPerBlock, farmTokenSupply, totalEnergy, userEnergy] =
            await Promise.all([
                this.farmGetter.getRewardsPerBlock(scAddress),
                this.farmGetter.getFarmTokenSupply(scAddress),
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
            .multipliedBy(liquidity)
            .dividedBy(farmTokenSupply);
        const userRewardsForWeek = new BigNumber(
            boostedYieldsFactors.maxRewardsFactor,
        )
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
                payment.amount = paymentAmount.toFixed();
                payment.nonce = 0;
                payment.tokenID = weeklyRewards.tokenID;
                payment.tokenType = weeklyRewards.tokenType;
                payments.push(payment);
            }
        }

        return payments;
    }
}
