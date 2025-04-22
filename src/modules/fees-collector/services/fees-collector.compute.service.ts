import { Injectable } from '@nestjs/common';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { BigNumber } from 'bignumber.js';
import { FeesCollectorAbiService } from './fees-collector.abi.service';
import { Constants, ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { EnergyService } from 'src/modules/energy/services/energy.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class FeesCollectorComputeService {
    constructor(
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        private readonly contextGetter: ContextGetterService,
        private readonly energyAbi: EnergyAbiService,
        private readonly energyService: EnergyService,
        private readonly tokenService: TokenService,
        private readonly tokenCompute: TokenComputeService,
    ) {}

    async computeUserRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]> {
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

        const payments: EsdtTokenPayment[] = [];
        if (totalRewardsForWeek.length === 0) {
            return payments;
        }

        if (!new BigNumber(userEnergyForWeek.amount).isGreaterThan(0)) {
            return payments;
        }

        for (const weeklyRewards of totalRewardsForWeek) {
            const paymentAmount = new BigNumber(weeklyRewards.amount)
                .multipliedBy(new BigNumber(userEnergyForWeek.amount))
                .dividedBy(new BigNumber(totalEnergyForWeek));
            if (paymentAmount.isGreaterThan(0)) {
                payments.push(
                    new EsdtTokenPayment({
                        tokenID: weeklyRewards.tokenID,
                        nonce: 0,
                        amount: paymentAmount.integerValue().toFixed(),
                        tokenType: weeklyRewards.tokenType,
                    }),
                );
            }
        }

        return payments;
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
        return this.weeklyRewardsSplittingCompute.computeDistribution(
            userRewardsForWeek,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async accumulatedFeesUntilNow(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return this.computeAccumulatedFeesUntilNow(scAddress, week);
    }

    async computeAccumulatedFeesUntilNow(
        scAddress: string,
        week: number,
    ): Promise<string> {
        const [lockedTokensPerBlock, blocksInWeek] = await Promise.all([
            this.feesCollectorAbi.lockedTokensPerBlock(),
            this.computeBlocksInWeek(scAddress, week),
        ]);

        return new BigNumber(lockedTokensPerBlock)
            .multipliedBy(blocksInWeek)
            .toFixed();
    }

    async computeUserLastWeekRewardsUSD(
        scAddress: string,
        userAddress: string,
        additionalUserEnergy = '0',
    ): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            scAddress,
        );
        const lastWeek = currentWeek - 1;
        const [totalRewardsForWeekUSD, userEnergyForWeek] = await Promise.all([
            this.weeklyRewardsSplittingCompute.totalRewardsForWeekUSD(
                scAddress,
                lastWeek,
            ),
            this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                scAddress,
                userAddress,
                lastWeek,
            ),
        ]);
        let totalEnergyForWeek =
            await this.weeklyRewardsSplittingAbi.totalEnergyForWeek(
                scAddress,
                lastWeek,
            );

        userEnergyForWeek.amount = new BigNumber(userEnergyForWeek.amount)
            .plus(additionalUserEnergy)
            .toFixed();
        totalEnergyForWeek = new BigNumber(totalEnergyForWeek)
            .plus(additionalUserEnergy)
            .toFixed();

        const userRewardsForWeekUSD = new BigNumber(totalRewardsForWeekUSD)
            .multipliedBy(userEnergyForWeek.amount)
            .dividedBy(totalEnergyForWeek);

        return userRewardsForWeekUSD.isNaN() ||
            !userRewardsForWeekUSD.isFinite()
            ? '0'
            : userRewardsForWeekUSD.toFixed();
    }

    async computeUserRewardsAPR(
        scAddress: string,
        userAddress: string,
        customEnergyAmount?: string,
        customLockedTokens?: string,
    ): Promise<BigNumber> {
        if (
            new BigNumber(customEnergyAmount).isZero() ||
            new BigNumber(customLockedTokens).isZero()
        ) {
            return new BigNumber(0);
        }

        const baseAssetTokenID = await this.energyAbi.baseAssetTokenID();

        const [
            baseToken,
            userEnergy,
            baseAssetTokenPriceUSD,
            userRewardsForWeekUSD,
        ] = await Promise.all([
            this.tokenService.tokenMetadata(baseAssetTokenID),
            this.energyService.getUserEnergy(userAddress),
            this.tokenCompute.tokenPriceDerivedUSD(baseAssetTokenID),
            this.computeUserLastWeekRewardsUSD(
                scAddress,
                userAddress,
                customEnergyAmount,
            ),
        ]);

        const userLockedTokensValueUSD = computeValueUSD(
            customLockedTokens ?? userEnergy.totalLockedTokens,
            baseToken.decimals,
            baseAssetTokenPriceUSD,
        );

        const userAPRForWeek = new BigNumber(userRewardsForWeekUSD)
            .multipliedBy(52)
            .dividedBy(userLockedTokensValueUSD)
            .multipliedBy(100);

        return userAPRForWeek;
    }

    private async computeBlocksInWeek(
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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: Constants.oneHour() * 4,
        localTtl: Constants.oneHour() * 3,
    })
    async accumulatedFeesUSD(week: number): Promise<string> {
        return this.computeAccumulatedFeesUSD(week);
    }

    async computeAccumulatedFeesUSD(week: number): Promise<string> {
        const allTokens = await this.feesCollectorAbi.allTokens();

        const tokensMetadata = await this.tokenService.getAllTokensMetadata(
            allTokens,
        );
        const tokenData = await Promise.all(
            allTokens.map(async (tokenId) => ({
                amount: await this.feesCollectorAbi.accumulatedFees(
                    week,
                    tokenId,
                ),
                price: await this.tokenCompute.tokenPriceDerivedUSD(tokenId),
            })),
        );

        const usdValues = allTokens.map((tokenId, index) => {
            return computeValueUSD(
                tokenData[index].amount,
                tokensMetadata[index].decimals,
                tokenData[index].price,
            );
        });

        const totalUsdValue = usdValues.reduce(
            (sum, value) => sum.plus(value),
            new BigNumber(0),
        );

        return totalUsdValue.toFixed();
    }
}
