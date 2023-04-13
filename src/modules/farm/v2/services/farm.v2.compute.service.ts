import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { FarmComputeService } from '../../base-module/services/farm.compute.service';
import BigNumber from 'bignumber.js';
import { EsdtTokenPayment } from '../../../../models/esdtTokenPayment.model';
import { FarmGetterServiceV2 } from './farm.v2.getter.service';
import { PairComputeService } from '../../../pair/services/pair.compute.service';
import { TokenComputeService } from '../../../tokens/services/token.compute.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { constantsConfig } from '../../../../config';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { PairService } from '../../../pair/services/pair.service';
import { PairGetterService } from '../../../pair/services/pair.getter.service';
import { ContextGetterService } from '../../../../services/context/context.getter.service';
import { EnergyType } from '@multiversx/sdk-exchange';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';

@Injectable()
export class FarmComputeServiceV2 extends FarmComputeService {
    constructor(
        @Inject(forwardRef(() => FarmGetterServiceV2))
        protected readonly farmGetter: FarmGetterServiceV2,
        protected readonly pairService: PairService,
        protected readonly pairGetter: PairGetterService,
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
    ) {
        super(
            farmGetter,
            pairService,
            pairGetter,
            pairCompute,
            contextGetter,
            tokenCompute,
            logger,
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
            boostedYieldsRewardsPercenatage,
            totalRewardsPerYearUSD,
            farmTokenSupplyUSD,
        ] = await Promise.all([
            this.farmGetter.getBoostedYieldsRewardsPercenatage(farmAddress),
            this.computeAnualRewardsUSD(farmAddress),
            this.farmGetter.getTotalValueLockedUSD(farmAddress),
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

    async computeUserAccumulatedRewards(
        scAddress: string,
        week: number,
        userAddress: string,
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
            this.farmGetter.getBoostedYieldsFactors(scAddress),
            this.farmGetter.getBoostedYieldsRewardsPercenatage(scAddress),
            this.farmGetter.userEnergyForWeek(scAddress, userAddress, week),
            this.farmGetter.getAccumulatedRewardsForWeek(scAddress, week),
            this.farmGetter.getRewardsPerBlock(scAddress),
            this.farmGetter.getFarmTokenSupply(scAddress),
            this.farmGetter.totalEnergyForWeek(scAddress, week),
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

    async computeUserRewardsForWeek(
        scAddress: string,
        totalRewardsForWeek: EsdtTokenPayment[],
        userEnergyForWeek: EnergyType,
        totalEnergyForWeek: string,
        energyAmount?: string,
        liquidity?: string,
    ): Promise<EsdtTokenPayment[]> {
        const payments: EsdtTokenPayment[] = [];

        const boostedYieldsFactors =
            await this.farmGetter.getBoostedYieldsFactors(scAddress);

        if (energyAmount === undefined) {
            energyAmount = userEnergyForWeek.amount;
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

        if (totalRewardsForWeek.length === 0) {
            return payments;
        }

        const [
            rewardsPerBlock,
            farmTokenSupply,
            boostedYieldsRewardsPercenatage,
        ] = await Promise.all([
            this.farmGetter.getRewardsPerBlock(scAddress),
            this.farmGetter.getFarmTokenSupply(scAddress),
            this.farmGetter.getBoostedYieldsRewardsPercenatage(scAddress),
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
            this.farmGetter.getBoostedYieldsFactors(scAddress),
            this.farmGetter.getFarmTokenSupply(scAddress),
            this.farmGetter.totalEnergyForWeek(scAddress, week),
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
