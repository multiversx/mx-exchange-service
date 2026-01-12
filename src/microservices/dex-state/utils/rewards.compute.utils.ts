import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { computeValueUSD } from 'src/utils/token.converters';

export function refreshWeekStartAndEndEpochs(time: WeekTimekeepingModel): void {
    time.startEpochForWeek =
        time.firstWeekStartEpoch +
        (time.currentWeek - 1) * constantsConfig.EPOCHS_IN_WEEK;
    time.endEpochForWeek =
        time.startEpochForWeek + constantsConfig.EPOCHS_IN_WEEK - 1;
}

export function computeDistribution(
    payments: EsdtTokenPayment[],
    tokens: Map<string, EsdtToken>,
): TokenDistributionModel[] {
    let totalPriceUSD = new BigNumber(0);
    const paymentsValueUSD = payments.map((payment) => {
        const token = tokens.get(payment.tokenID);

        if (!token) {
            throw new Error(`Token ${payment.tokenID} missing`);
        }

        const reward = computeValueUSD(
            payment.amount,
            token.decimals,
            token.price,
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

export function computeTotalRewardsForWeekUSD(
    totalRewardsForWeek: EsdtTokenPayment[],
    baseAssetTokenId: string,
    lockedTokenId: string,
    tokens: Map<string, EsdtToken>,
): string {
    return totalRewardsForWeek
        .reduce((acc, reward) => {
            const tokenID =
                reward.tokenID === lockedTokenId
                    ? baseAssetTokenId
                    : reward.tokenID;

            const token = tokens.get(tokenID);

            if (!token) {
                throw new Error(`Token ${reward.tokenID} missing`);
            }

            const rewardUSD = computeValueUSD(
                reward.amount,
                token.decimals,
                token.price,
            );
            return acc.plus(rewardUSD);
        }, new BigNumber(0))
        .toFixed();
}

export function computeWeekAPR(
    totalLockedTokensForWeek: string,
    totalRewardsForWeek: EsdtTokenPayment[],
    baseAssetToken: EsdtToken,
    lockedTokenId: string,
    tokens: Map<string, EsdtToken>,
    scAddressSet: Set<string>,
): string {
    if (!scAddressSet.has(baseAssetToken.identifier)) {
        return '0';
    }

    const tokenPriceUSD = scAddressSet.has(baseAssetToken.identifier)
        ? baseAssetToken.price
        : '0';

    const totalLockedTokensForWeekPriceUSD = new BigNumber(
        totalLockedTokensForWeek,
    )
        .multipliedBy(new BigNumber(tokenPriceUSD))
        .toFixed();

    const totalRewardsForWeekPriceUSD = computeTotalRewardsForWeekUSD(
        totalRewardsForWeek,
        baseAssetToken.identifier,
        lockedTokenId,
        tokens,
    );

    const weekAPR = new BigNumber(totalRewardsForWeekPriceUSD)
        .times(52)
        .div(totalLockedTokensForWeekPriceUSD);

    return weekAPR.isNaN() || !weekAPR.isFinite() ? '0' : weekAPR.toFixed();
}

export function computeBaseRewards(
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
