import { Injectable } from '@nestjs/common';
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
        private readonly tokenCompute: TokenComputeService,
        private readonly tokenService: TokenService,
    ) {}

    async computeDistribution(
        payments: EsdtTokenPayment[],
    ): Promise<TokenDistributionModel[]> {
        let totalPriceUSD = new BigNumber('0');
        const tokenDistributionModels = [];

        const tokenDistributions = await Promise.all(
            payments.map(async (token) => {
                const tokenPriceUSD =
                    await this.tokenCompute.computeTokenPriceDerivedUSD(
                        token.tokenID,
                    );
                const rewardsPriceUSD = new BigNumber(
                    tokenPriceUSD,
                ).multipliedBy(new BigNumber(token.amount));

                return {
                    tokenID: token.tokenID,
                    rewardsPriceUSD: rewardsPriceUSD,
                };
            }),
        );

        tokenDistributions.forEach((token) => {
            tokenDistributionModels.push(
                new TokenDistributionModel({
                    tokenId: token.tokenID,
                    percentage: token.rewardsPriceUSD.toFixed(),
                }),
            );
            totalPriceUSD = totalPriceUSD.plus(token.rewardsPriceUSD);
        });

        return tokenDistributionModels.map((model: TokenDistributionModel) => {
            model.percentage = new BigNumber(model.percentage)
                .dividedBy(totalPriceUSD)
                .multipliedBy(100)
                .toFixed(4);
            return model;
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
        return await this.computeWeekAPR(scAddress, week);
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

        return new BigNumber(totalRewardsForWeekPriceUSD)
            .times(52)
            .div(totalLockedTokensForWeekPriceUSD)
            .toFixed();
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
        return await this.computeUserApr(scAddress, userAddress, week);
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
        ]);
        const globalApr = await this.computeWeekAPR(scAddress, week);

        const apr = new BigNumber(globalApr)
            .multipliedBy(new BigNumber(userEnergyForWeek.amount))
            .multipliedBy(new BigNumber(totalLockedTokensForWeek))
            .div(new BigNumber(totalEnergyForWeek))
            .div(new BigNumber(userEnergyForWeek.totalLockedTokens))
            .toFixed();
        return apr;
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
        return await this.computeTotalRewardsForWeekUSD(scAddress, week);
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
        let totalPriceUSD = new BigNumber(0);

        const totalRewardsArray = await Promise.all(
            totalRewardsForWeek.map(async (reward) => {
                const tokenID =
                    reward.tokenID === lockedTokenID
                        ? baseAssetTokenID
                        : reward.tokenID;
                const [token, rewardsPriceUSD] = await Promise.all([
                    this.tokenService.tokenMetadata(tokenID),
                    this.tokenCompute.computeTokenPriceDerivedUSD(tokenID),
                ]);
                return computeValueUSD(
                    reward.amount,
                    token.decimals,
                    rewardsPriceUSD,
                );
            }),
        );

        totalRewardsArray.forEach(
            (reward) => (totalPriceUSD = totalPriceUSD.plus(reward)),
        );
        return totalPriceUSD.toFixed();
    }

    async computeTotalLockedTokensForWeekPriceUSD(
        totalLockedTokensForWeek: string,
    ): Promise<string> {
        const baseAssetTokenID = await this.energyAbi.baseAssetTokenID();
        let tokenPriceUSD = '0';
        if (scAddress.has(baseAssetTokenID)) {
            tokenPriceUSD = await this.tokenCompute.computeTokenPriceDerivedUSD(
                baseAssetTokenID,
            );
        }
        return new BigNumber(totalLockedTokensForWeek)
            .multipliedBy(new BigNumber(tokenPriceUSD))
            .toFixed();
    }
}
