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
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { FarmAbiServiceV2 } from './farm.v2.abi.service';
import { FarmServiceV2 } from './farm.v2.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { CacheService } from 'src/services/caching/cache.service';
import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { IFarmComputeServiceV2 } from './interfaces';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { FarmModelV2 } from '../../models/farm.v2.model';
import { EnergyType } from '@multiversx/sdk-exchange';

@Injectable()
export class FarmComputeServiceV2
    extends FarmComputeService
    implements IFarmComputeServiceV2
{
    constructor(
        protected readonly farmAbi: FarmAbiServiceV2,
        @Inject(forwardRef(() => FarmServiceV2))
        protected readonly farmService: FarmServiceV2,
        @Inject(forwardRef(() => PairService))
        protected readonly pairService: PairService,
        @Inject(forwardRef(() => PairComputeService))
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
        protected readonly cachingService: CacheService,
        private readonly weekTimeKeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
    ) {
        super(
            farmAbi,
            farmService,
            pairService,
            pairCompute,
            contextGetter,
            tokenCompute,
            cachingService,
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
        return this.computeFarmBaseAPR(farmAddress);
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

    async computeMintedRewards(farmAddress: string): Promise<BigNumber> {
        const [toBeMinted, boostedYieldsRewardsPercenatage] = await Promise.all(
            [
                super.computeMintedRewards(farmAddress),
                this.farmAbi.boostedYieldsRewardsPercenatage(farmAddress),
            ],
        );

        return this.computeBaseRewards(
            toBeMinted,
            boostedYieldsRewardsPercenatage,
        );
    }

    computeRewardsIncrease(farm: FarmModelV2, currentNonce: number): BigNumber {
        const currentBlockBig = new BigNumber(currentNonce);
        const lastRewardBlockNonceBig = new BigNumber(
            farm.lastRewardBlockNonce,
        );
        const perBlockRewardAmountBig = new BigNumber(farm.perBlockRewards);

        let toBeMinted = new BigNumber(0);

        if (
            currentNonce > farm.lastRewardBlockNonce &&
            farm.produceRewardsEnabled
        ) {
            toBeMinted = perBlockRewardAmountBig.times(
                currentBlockBig.minus(lastRewardBlockNonceBig),
            );
        }

        return this.computeBaseRewards(
            toBeMinted,
            farm.boostedYieldsRewardsPercenatage,
        );
    }

    computeRewardsForPosition(
        farm: FarmModelV2,
        positon: CalculateRewardsArgs,
        rewardPerShare: string,
        currentNonce: number,
    ): BigNumber {
        const rewardIncrease = this.computeRewardsIncrease(farm, currentNonce);

        const amountBig = new BigNumber(positon.liquidity);
        const divisionSafetyConstantBig = new BigNumber(
            farm.divisionSafetyConstant,
        );
        const farmTokenSupplyBig = new BigNumber(farm.farmTokenSupply);
        const farmRewardPerShareBig = new BigNumber(farm.rewardPerShare);
        const rewardPerShareBig = new BigNumber(rewardPerShare);

        const rewardPerShareIncrease = rewardIncrease
            .times(divisionSafetyConstantBig)
            .dividedBy(farmTokenSupplyBig)
            .integerValue();
        const futureRewardPerShare = farmRewardPerShareBig.plus(
            rewardPerShareIncrease,
        );

        if (futureRewardPerShare.isGreaterThan(rewardPerShare)) {
            const rewardPerShareDiff =
                futureRewardPerShare.minus(rewardPerShareBig);

            return amountBig
                .times(rewardPerShareDiff)
                .dividedBy(divisionSafetyConstantBig)
                .integerValue();
        }
        return new BigNumber(0);
    }

    async computeFarmRewardsForPosition(
        positon: CalculateRewardsArgs,
        rewardPerShare: string,
    ): Promise<BigNumber> {
        return super.computeFarmRewardsForPosition(positon, rewardPerShare);
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

    async computeUserRewardsDistributionForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<TokenDistributionModel[]> {
        const rewardTokenID = await this.farmAbi.farmedTokenID(scAddress);
        const userRewardsForWeek = await this.computeUserRewardsForWeek(
            scAddress,
            userAddress,
            week,
        );
        return this.weeklyRewardsSplittingCompute.computeDistribution([
            new EsdtTokenPayment({
                tokenID: rewardTokenID,
                nonce: 0,
                amount: userRewardsForWeek,
            }),
        ]);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async userAccumulatedRewards(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<string> {
        return this.computeUserRewardsForWeek(scAddress, userAddress, week);
    }

    async userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]> {
        const rewardTokenID = await this.farmAbi.farmedTokenID(scAddress);
        const rewards = await this.computeUserRewardsForWeek(
            scAddress,
            userAddress,
            week,
        );

        return [
            new EsdtTokenPayment({
                tokenID: rewardTokenID,
                nonce: 0,
                amount: rewards,
            }),
        ];
    }

    computeUserRewardsForWeekFromState(
        farm: FarmModelV2,
        userEnergyForWeek: EnergyType,
        liquidity: string,
        week: number,
        additionalUserFarmAmount = '0',
        additionalUserEnergyAmount = '0',
        rewardsPerWeek?: string,
    ): string {
        let rewardsForWeek: string;
        const boostedRewardsForWeek = farm.boosterRewards.find(
            (rewards) => rewards.week === week,
        );

        if (week === farm.time.currentWeek) {
            rewardsForWeek = farm.accumulatedRewards;
        } else {
            const totalRewards = boostedRewardsForWeek.totalRewardsForWeek;

            rewardsForWeek = totalRewards[0]?.amount ?? '0';
        }

        rewardsForWeek = rewardsPerWeek ?? rewardsForWeek;

        if (rewardsForWeek === undefined) {
            return '0';
        }

        let farmTokenSupply =
            week === farm.time.currentWeek
                ? farm.farmTokenSupply
                : farm.farmTokenSupplyCurrentWeek;

        userEnergyForWeek.amount = new BigNumber(userEnergyForWeek.amount)
            .plus(additionalUserEnergyAmount)
            .toFixed();
        const totalEnergyForWeek = new BigNumber(
            boostedRewardsForWeek.totalEnergyForWeek,
        )
            .plus(additionalUserEnergyAmount)
            .toFixed();
        const liquidityBn = new BigNumber(liquidity).plus(
            additionalUserFarmAmount,
        );
        farmTokenSupply = new BigNumber(farmTokenSupply)
            .plus(additionalUserFarmAmount)
            .toFixed();

        const userHasMinEnergy = new BigNumber(
            userEnergyForWeek.amount,
        ).isGreaterThan(farm.boostedYieldsFactors.minEnergyAmount);
        if (!userHasMinEnergy) {
            return '0';
        }

        const userMinFarmAmount = liquidityBn.isGreaterThan(
            farm.boostedYieldsFactors.minFarmAmount,
        );
        if (!userMinFarmAmount) {
            return '0';
        }

        const weeklyRewardsAmount = new BigNumber(rewardsForWeek);
        if (weeklyRewardsAmount.isZero()) {
            return '0';
        }

        const userMaxRewards = weeklyRewardsAmount
            .multipliedBy(liquidityBn)
            .multipliedBy(farm.boostedYieldsFactors.maxRewardsFactor)
            .dividedBy(farmTokenSupply)
            .integerValue();

        const boostedRewardsByEnergy = weeklyRewardsAmount
            .multipliedBy(farm.boostedYieldsFactors.userRewardsEnergy)
            .multipliedBy(userEnergyForWeek.amount)
            .dividedBy(totalEnergyForWeek)
            .integerValue();

        const boostedRewardsByTokens = weeklyRewardsAmount
            .multipliedBy(farm.boostedYieldsFactors.userRewardsFarm)
            .multipliedBy(liquidityBn)
            .dividedBy(farmTokenSupply)
            .integerValue();

        const constantsBase = new BigNumber(
            farm.boostedYieldsFactors.userRewardsEnergy,
        ).plus(farm.boostedYieldsFactors.userRewardsFarm);

        const boostedRewardAmount = boostedRewardsByEnergy
            .plus(boostedRewardsByTokens)
            .dividedBy(constantsBase)
            .integerValue();

        const userRewardForWeek =
            boostedRewardAmount.comparedTo(userMaxRewards) < 1
                ? boostedRewardAmount
                : userMaxRewards;

        return userRewardForWeek.toFixed();
    }

    async computeUserRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        additionalUserFarmAmount = '0',
        additionalUserEnergyAmount = '0',
        rewardsPerWeek?: string,
    ): Promise<string> {
        const [currentWeek, boostedYieldsFactors, userEnergyForWeek] =
            await Promise.all([
                this.weekTimeKeepingAbi.currentWeek(scAddress),
                this.farmAbi.boostedYieldsFactors(scAddress),
                this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                    scAddress,
                    userAddress,
                    week,
                ),
            ]);

        let rewardsForWeek: string;

        if (week === currentWeek) {
            rewardsForWeek = await this.farmAbi.accumulatedRewardsForWeek(
                scAddress,
                week,
            );
        } else {
            const totalRewards =
                await this.weeklyRewardsSplittingAbi.totalRewardsForWeek(
                    scAddress,
                    week,
                );
            rewardsForWeek = totalRewards[0]?.amount ?? '0';
        }

        rewardsForWeek = rewardsPerWeek ?? rewardsForWeek;

        if (rewardsForWeek === undefined) {
            return '0';
        }

        let [totalEnergyForWeek, liquidity] = await Promise.all([
            this.weeklyRewardsSplittingAbi.totalEnergyForWeek(scAddress, week),
            this.farmAbi.userTotalFarmPosition(scAddress, userAddress),
        ]);
        let farmTokenSupply =
            week === currentWeek
                ? await this.farmAbi.farmTokenSupply(scAddress)
                : await this.farmAbi.farmSupplyForWeek(scAddress, week);

        userEnergyForWeek.amount = new BigNumber(userEnergyForWeek.amount)
            .plus(additionalUserEnergyAmount)
            .toFixed();
        totalEnergyForWeek = new BigNumber(totalEnergyForWeek)
            .plus(additionalUserEnergyAmount)
            .toFixed();
        liquidity = new BigNumber(liquidity)
            .plus(additionalUserFarmAmount)
            .toFixed();
        farmTokenSupply = new BigNumber(farmTokenSupply)
            .plus(additionalUserFarmAmount)
            .toFixed();

        const userHasMinEnergy = new BigNumber(
            userEnergyForWeek.amount,
        ).isGreaterThan(boostedYieldsFactors.minEnergyAmount);
        if (!userHasMinEnergy) {
            return '0';
        }

        const userMinFarmAmount = new BigNumber(liquidity).isGreaterThan(
            boostedYieldsFactors.minFarmAmount,
        );
        if (!userMinFarmAmount) {
            return '0';
        }

        const weeklyRewardsAmount = new BigNumber(rewardsForWeek);
        if (weeklyRewardsAmount.isZero()) {
            return '0';
        }

        const userMaxRewards = weeklyRewardsAmount
            .multipliedBy(liquidity)
            .multipliedBy(boostedYieldsFactors.maxRewardsFactor)
            .dividedBy(farmTokenSupply)
            .integerValue();

        const boostedRewardsByEnergy = weeklyRewardsAmount
            .multipliedBy(boostedYieldsFactors.userRewardsEnergy)
            .multipliedBy(userEnergyForWeek.amount)
            .dividedBy(totalEnergyForWeek)
            .integerValue();

        const boostedRewardsByTokens = weeklyRewardsAmount
            .multipliedBy(boostedYieldsFactors.userRewardsFarm)
            .multipliedBy(liquidity)
            .dividedBy(farmTokenSupply)
            .integerValue();

        const constantsBase = new BigNumber(
            boostedYieldsFactors.userRewardsEnergy,
        ).plus(boostedYieldsFactors.userRewardsFarm);

        const boostedRewardAmount = boostedRewardsByEnergy
            .plus(boostedRewardsByTokens)
            .dividedBy(constantsBase)
            .integerValue();

        const userRewardForWeek =
            boostedRewardAmount.comparedTo(userMaxRewards) < 1
                ? boostedRewardAmount
                : userMaxRewards;

        return userRewardForWeek.toFixed();
    }

    async computeUserEstimatedWeeklyRewards(
        scAddress: string,
        userAddress: string,
        additionalUserFarmAmount = '0',
        additionalUserEnergy = '0',
    ): Promise<string> {
        const [currentWeek, boostedRewardsPerWeek] = await Promise.all([
            this.weekTimeKeepingAbi.currentWeek(scAddress),
            this.computeBoostedRewardsPerWeek(scAddress),
        ]);

        let userTotalFarmPosition = await this.farmAbi.userTotalFarmPosition(
            scAddress,
            userAddress,
        );
        userTotalFarmPosition = new BigNumber(userTotalFarmPosition)
            .plus(additionalUserFarmAmount)
            .toFixed();

        if (userTotalFarmPosition === '0') {
            return '0';
        }

        return this.computeUserRewardsForWeek(
            scAddress,
            userAddress,
            currentWeek,
            additionalUserFarmAmount,
            additionalUserEnergy,
            boostedRewardsPerWeek,
        );
    }

    async computeUserCurentBoostedAPR(
        scAddress: string,
        userAddress: string,
        additionalUserFarmAmount = '0',
        additionalUserEnergy = '0',
    ): Promise<number> {
        const [
            userRewardsPerWeek,
            userTotalFarmPosition,
            farmToken,
            farmedToken,
            farmingTokenPriceUSD,
            farmedTokenPriceUSD,
        ] = await Promise.all([
            this.computeUserEstimatedWeeklyRewards(
                scAddress,
                userAddress,
                additionalUserFarmAmount,
                additionalUserEnergy,
            ),
            this.farmAbi.userTotalFarmPosition(scAddress, userAddress),
            this.farmService.getFarmToken(scAddress),
            this.farmService.getFarmedToken(scAddress),
            this.farmingTokenPriceUSD(scAddress),
            this.farmedTokenPriceUSD(scAddress),
        ]);

        if (userRewardsPerWeek === '0') {
            return 0;
        }

        const userTotalFarmPositionUSD = computeValueUSD(
            userTotalFarmPosition,
            farmToken.decimals,
            farmingTokenPriceUSD,
        );
        const userRewardsPerWeekUSD = computeValueUSD(
            userRewardsPerWeek,
            farmedToken.decimals,
            farmedTokenPriceUSD,
        );

        return new BigNumber(userRewardsPerWeekUSD)
            .multipliedBy(52)
            .dividedBy(userTotalFarmPositionUSD)
            .toNumber();
    }

    async computeUserMaxBoostedAPR(
        scAddress: string,
        userAddress: string,
        additionalUserFarmAmount = '0',
    ): Promise<number> {
        const [
            boostedRewardsPerWeek,
            boostedYieldsFactors,
            farmToken,
            farmedToken,
            farmingTokenPriceUSD,
            farmedTokenPriceUSD,
        ] = await Promise.all([
            this.computeBoostedRewardsPerWeek(scAddress),
            this.farmAbi.boostedYieldsFactors(scAddress),
            this.farmService.getFarmToken(scAddress),
            this.farmService.getFarmedToken(scAddress),
            this.farmingTokenPriceUSD(scAddress),
            this.farmedTokenPriceUSD(scAddress),
        ]);

        let [farmTokenSupply, userTotalFarmPosition] = await Promise.all([
            this.farmAbi.farmTokenSupply(scAddress),
            this.farmAbi.userTotalFarmPosition(scAddress, userAddress),
        ]);
        farmTokenSupply = new BigNumber(farmTokenSupply)
            .plus(additionalUserFarmAmount)
            .toFixed();
        userTotalFarmPosition = new BigNumber(userTotalFarmPosition)
            .plus(additionalUserFarmAmount)
            .toFixed();

        if (userTotalFarmPosition === '0') {
            return 0;
        }

        const userMaxRewardsPerWeek = new BigNumber(boostedRewardsPerWeek)
            .multipliedBy(boostedYieldsFactors.maxRewardsFactor)
            .multipliedBy(userTotalFarmPosition)
            .dividedBy(farmTokenSupply);

        const userTotalFarmPositionUSD = computeValueUSD(
            userTotalFarmPosition,
            farmToken.decimals,
            farmingTokenPriceUSD,
        );
        const userMaxRewardsPerWeekUSD = computeValueUSD(
            userMaxRewardsPerWeek.toFixed(),
            farmedToken.decimals,
            farmedTokenPriceUSD,
        );

        return userMaxRewardsPerWeekUSD
            .multipliedBy(52)
            .dividedBy(userTotalFarmPositionUSD)
            .toNumber();
    }

    async computeBoostedRewardsPerWeek(scAddress: string): Promise<string> {
        const [rewardsPerBlock, boostedYieldsRewardsPercentage] =
            await Promise.all([
                this.farmAbi.rewardsPerBlock(scAddress),
                this.farmAbi.boostedYieldsRewardsPercenatage(scAddress),
            ]);

        const blocksInWeek = 14440 * 7;
        const totalRewardsPerWeek = new BigNumber(rewardsPerBlock).multipliedBy(
            blocksInWeek,
        );

        return totalRewardsPerWeek
            .multipliedBy(boostedYieldsRewardsPercentage)
            .dividedBy(constantsConfig.MAX_PERCENT)
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
    async optimalEnergyPerLP(scAddress: string, week: number): Promise<string> {
        return this.computeOptimalEnergyPerLP(scAddress, week);
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
        const lastUndistributedBoostedRewardsCollectWeek =
            await this.farmAbi.lastUndistributedBoostedRewardsCollectWeek(
                scAddress,
            );

        const firstWeek = lastUndistributedBoostedRewardsCollectWeek + 1;
        const lastWeek = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS - 1;

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
        return remainingRewards.reduce((acc, curr) => {
            return new BigNumber(acc).plus(curr);
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async maxBoostedApr(farmAddress: string): Promise<string> {
        return this.computeMaxBoostedApr(farmAddress);
    }

    async computeMaxBoostedApr(farmAddress: string): Promise<string> {
        const [baseAPR, boostedYieldsFactors, boostedYieldsRewardsPercentage] =
            await Promise.all([
                this.farmBaseAPR(farmAddress),
                this.farmAbi.boostedYieldsFactors(farmAddress),
                this.farmAbi.boostedYieldsRewardsPercenatage(farmAddress),
            ]);

        const bnRawMaxBoostedApr = new BigNumber(baseAPR)
            .multipliedBy(boostedYieldsFactors.maxRewardsFactor)
            .multipliedBy(boostedYieldsRewardsPercentage)
            .dividedBy(
                constantsConfig.MAX_PERCENT - boostedYieldsRewardsPercentage,
            );

        return bnRawMaxBoostedApr.toFixed();
    }
}
