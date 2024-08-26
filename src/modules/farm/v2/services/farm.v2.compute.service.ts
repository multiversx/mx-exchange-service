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
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { IFarmComputeServiceV2 } from './interfaces';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { computeValueUSD } from 'src/utils/token.converters';

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
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
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

    async computeUserRewardsDistributionForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<TokenDistributionModel[]> {
        const userRewardsForWeek = await this.computeUserRewardsForWeek(
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
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async userAccumulatedRewards(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<string> {
        const rewards = await this.computeUserRewardsForWeek(
            scAddress,
            userAddress,
            week,
        );

        return rewards[0] ? rewards[0].amount : '0';
    }

    async computeUserRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
        rewardsPerWeek?: EsdtTokenPayment[],
    ): Promise<EsdtTokenPayment[]> {
        const userRewardsForWeek = [];

        const [currentWeek, userEnergyForWeek, totalEnergyForWeek, liquidity] =
            await Promise.all([
                this.weekTimeKeepingAbi.currentWeek(scAddress),
                this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                    scAddress,
                    userAddress,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.totalEnergyForWeek(
                    scAddress,
                    week,
                ),

                this.farmAbi.userTotalFarmPosition(scAddress, userAddress),
            ]);

        const rewardsForWeek =
            rewardsPerWeek ??
            (await this.weeklyRewardsSplittingAbi.totalRewardsForWeek(
                scAddress,
                week,
            ));

        if (rewardsForWeek.length === 0) {
            return userRewardsForWeek;
        }

        if (rewardsForWeek.length !== 1) {
            throw new Error('Invalid boosted yields rewards');
        }

        const boostedYieldsFactors = await this.farmAbi.boostedYieldsFactors(
            scAddress,
        );

        const userHasMinEnergy = new BigNumber(
            userEnergyForWeek.amount,
        ).isGreaterThan(boostedYieldsFactors.minEnergyAmount);
        if (!userHasMinEnergy) {
            return userRewardsForWeek;
        }

        const userMinFarmAmount = new BigNumber(liquidity).isGreaterThan(
            boostedYieldsFactors.minFarmAmount,
        );
        if (!userMinFarmAmount) {
            return userRewardsForWeek;
        }

        const farmTokenSupply =
            week === currentWeek
                ? await this.farmAbi.farmTokenSupply(scAddress)
                : await this.farmAbi.farmSupplyForWeek(scAddress, week);

        const rewardForWeek = rewardsForWeek[0];

        const weeklyRewardsAmount = new BigNumber(rewardForWeek.amount);
        if (weeklyRewardsAmount.isZero()) {
            return userRewardsForWeek;
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

        if (userRewardForWeek.isPositive()) {
            userRewardsForWeek.push(
                new EsdtTokenPayment({
                    tokenID: rewardForWeek.tokenID,
                    nonce: rewardForWeek.nonce,
                    amount: userRewardForWeek.toFixed(),
                }),
            );
        }

        return userRewardsForWeek;
    }

    async computeUserCurentBoostedAPR(
        scAddress: string,
        userAddress: string,
    ): Promise<number> {
        const [
            currentWeek,
            boostedRewardsPerWeek,
            userTotalFarmPosition,
            farmToken,
            farmedToken,
            farmingTokenPriceUSD,
            farmedTokenPriceUSD,
        ] = await Promise.all([
            this.weekTimeKeepingAbi.currentWeek(scAddress),
            this.computeBoostedRewardsPerWeek(scAddress),
            this.farmAbi.userTotalFarmPosition(scAddress, userAddress),
            this.farmService.getFarmToken(scAddress),
            this.farmService.getFarmedToken(scAddress),
            this.farmingTokenPriceUSD(scAddress),
            this.farmedTokenPriceUSD(scAddress),
        ]);

        const userRewardsPerWeek = await this.computeUserRewardsForWeek(
            scAddress,
            userAddress,
            currentWeek,
            boostedRewardsPerWeek,
        );

        const userTotalFarmPositionUSD = computeValueUSD(
            userTotalFarmPosition,
            farmToken.decimals,
            farmingTokenPriceUSD,
        );
        const userRewardsPerWeekUSD = computeValueUSD(
            userRewardsPerWeek[0].amount,
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
    ): Promise<number> {
        const [
            boostedRewardsPerWeek,
            boostedYieldsFactors,
            farmTokenSupply,
            userTotalFarmPosition,
            farmToken,
            farmedToken,
            farmingTokenPriceUSD,
            farmedTokenPriceUSD,
        ] = await Promise.all([
            this.computeBoostedRewardsPerWeek(scAddress),
            this.farmAbi.boostedYieldsFactors(scAddress),
            this.farmAbi.farmTokenSupply(scAddress),
            this.farmAbi.userTotalFarmPosition(scAddress, userAddress),
            this.farmService.getFarmToken(scAddress),
            this.farmService.getFarmedToken(scAddress),
            this.farmingTokenPriceUSD(scAddress),
            this.farmedTokenPriceUSD(scAddress),
        ]);

        const userMaxRewardsPerWeek = new BigNumber(
            boostedRewardsPerWeek[0].amount,
        )
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

    async computeBoostedRewardsPerWeek(
        scAddress: string,
    ): Promise<EsdtTokenPayment[]> {
        const [rewardTokenID, rewardsPerBlock, boostedYieldsRewardsPercentage] =
            await Promise.all([
                this.farmAbi.farmedTokenID(scAddress),
                this.farmAbi.rewardsPerBlock(scAddress),
                this.farmAbi.boostedYieldsRewardsPercenatage(scAddress),
            ]);

        const blocksInWeek = 14440 * 7;
        const totalRewardsPerWeek = new BigNumber(rewardsPerBlock).multipliedBy(
            blocksInWeek,
        );

        return [
            new EsdtTokenPayment({
                tokenID: rewardTokenID,
                nonce: 0,
                amount: totalRewardsPerWeek
                    .multipliedBy(boostedYieldsRewardsPercentage)
                    .dividedBy(constantsConfig.MAX_PERCENT)
                    .integerValue()
                    .toFixed(),
            }),
        ];
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
        const [startEpochForCurrentWeek, currentEpoch, shardID] =
            await Promise.all([
                this.weekTimekeepingCompute.startEpochForWeek(scAddress, week),
                this.contextGetter.getCurrentEpoch(),
                this.farmAbi.farmShard(scAddress),
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
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async maxBoostedApr(farmAddress: string): Promise<string> {
        return await this.computeMaxBoostedApr(farmAddress);
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
