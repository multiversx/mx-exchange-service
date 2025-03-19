import { Inject, Injectable, forwardRef } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { TokenDistributionModel } from '../models/weekly-rewards-splitting.model';
import { IWeeklyRewardsSplittingComputeService } from '../interfaces';
import { scAddress } from '../../../config';
import { TokenComputeService } from '../../../modules/tokens/services/token.compute.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { WeeklyRewardsSplittingAbiService } from './weekly-rewards-splitting.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { computeValueUSD } from 'src/utils/token.converters';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class WeeklyRewardsSplittingComputeService
    implements IWeeklyRewardsSplittingComputeService
{
    constructor(
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly energyAbi: EnergyAbiService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
        @Inject(forwardRef(() => TokenService))
        private readonly tokenService: TokenService,
    ) {}

    async computeDistribution(
        payments: EsdtTokenPayment[],
    ): Promise<TokenDistributionModel[]> {
        const tokensPriceUSD =
            await this.tokenCompute.getAllTokensPriceDerivedUSD(
                payments.map((payment) => payment.tokenID),
            );

        let totalPriceUSD = new BigNumber(0);
        const paymentsValueUSD = payments.map((payment, index) => {
            const reward = new BigNumber(tokensPriceUSD[index]).multipliedBy(
                payment.amount,
            );
            totalPriceUSD = totalPriceUSD.plus(reward);
            return reward;
        });

        return payments.map((payment, index) => {
            const valueUSD = paymentsValueUSD[index];
            const percentage = totalPriceUSD.isZero()
                ? '0.0000'
                : valueUSD
                      .dividedBy(totalPriceUSD)
                      .multipliedBy(100)
                      .toFixed(4);
            return new TokenDistributionModel({
                tokenId: payment.tokenID,
                percentage,
            });
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weeklyRewards',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async weekAPR(scAddress: string, week: number): Promise<string> {
        return this.computeWeekAPR(scAddress, week);
    }

    async computeWeekAPR(scAddress: string, week: number): Promise<string> {
        const totalLockedTokensForWeek =
            await this.weeklyRewardsSplittingAbi.totalLockedTokensForWeek(
                scAddress,
                week,
            );

        const totalLockedTokensForWeekPriceUSD =
            await this.computeTotalLockedTokensForWeekPriceUSD(
                totalLockedTokensForWeek,
            );
        const totalRewardsForWeekPriceUSD =
            await this.computeTotalRewardsForWeekUSD(scAddress, week);

        const weekAPR = new BigNumber(totalRewardsForWeekPriceUSD)
            .times(52)
            .div(totalLockedTokensForWeekPriceUSD);

        return weekAPR.isNaN() || !weekAPR.isFinite() ? '0' : weekAPR.toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weeklyRewards',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userApr(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<string> {
        return this.computeUserApr(scAddress, userAddress, week);
    }

    async computeUserApr(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<string> {
        const [
            totalLockedTokensForWeek,
            totalEnergyForWeek,
            userEnergyForWeek,
            globalApr,
        ] = await Promise.all([
            this.weeklyRewardsSplittingAbi.totalLockedTokensForWeek(
                scAddress,
                week,
            ),
            this.weeklyRewardsSplittingAbi.totalEnergyForWeek(scAddress, week),
            this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                scAddress,
                userAddress,
                week,
            ),
            this.weekAPR(scAddress, week),
        ]);

        const apr = new BigNumber(globalApr)
            .multipliedBy(new BigNumber(userEnergyForWeek.amount))
            .multipliedBy(new BigNumber(totalLockedTokensForWeek))
            .div(new BigNumber(totalEnergyForWeek))
            .div(new BigNumber(userEnergyForWeek.totalLockedTokens));

        return apr.isNaN() || !apr.isFinite() ? '0' : apr.toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weeklyRewards',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async totalRewardsForWeekUSD(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return this.computeTotalRewardsForWeekUSD(scAddress, week);
    }

    async computeTotalRewardsForWeekUSD(
        scAddress: string,
        week: number,
    ): Promise<string> {
        const [baseAssetTokenID, lockedTokenID, totalRewardsForWeek] =
            await Promise.all([
                this.energyAbi.baseAssetTokenID(),
                this.energyAbi.lockedTokenID(),
                this.weeklyRewardsSplittingAbi.totalRewardsForWeek(
                    scAddress,
                    week,
                ),
            ]);

        const tokenIDs = totalRewardsForWeek.map((reward) =>
            reward.tokenID === lockedTokenID
                ? baseAssetTokenID
                : reward.tokenID,
        );

        const [tokensMetadata, tokensPriceUSD] = await Promise.all([
            this.tokenService.getAllTokensMetadata(tokenIDs),
            this.tokenCompute.getAllTokensPriceDerivedUSD(tokenIDs),
        ]);

        return totalRewardsForWeek
            .reduce((acc, reward, index) => {
                const rewardUSD = computeValueUSD(
                    reward.amount,
                    tokensMetadata[index].decimals,
                    tokensPriceUSD[index],
                );
                return acc.plus(rewardUSD);
            }, new BigNumber(0))
            .toFixed();
    }

    async computeTotalLockedTokensForWeekPriceUSD(
        totalLockedTokensForWeek: string,
    ): Promise<string> {
        const baseAssetTokenID = await this.energyAbi.baseAssetTokenID();
        let tokenPriceUSD = '0';
        if (scAddress.has(baseAssetTokenID)) {
            tokenPriceUSD = await this.tokenCompute.tokenPriceDerivedUSD(
                baseAssetTokenID,
            );
        }
        return new BigNumber(totalLockedTokensForWeek)
            .multipliedBy(new BigNumber(tokenPriceUSD))
            .toFixed();
    }
}
