import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { computeValueUSD } from 'src/utils/token.converters';
import { StateStore } from '../services/state.store';

export function refreshWeekStartAndEndEpochs(time: WeekTimekeepingModel): void {
    time.startEpochForWeek =
        time.firstWeekStartEpoch +
        (time.currentWeek - 1) * constantsConfig.EPOCHS_IN_WEEK;
    time.endEpochForWeek =
        time.startEpochForWeek + constantsConfig.EPOCHS_IN_WEEK - 1;
}

export function computeDistribution(
    payments: EsdtTokenPayment[],
    stateStore: StateStore,
): TokenDistributionModel[] {
    let totalPriceUSD = new BigNumber(0);
    const paymentsValueUSD = payments.map((payment) => {
        let token: EsdtToken;
        if (payment.tokenID === stateStore.lockedTokenCollection) {
            token = stateStore.tokens.get(constantsConfig.MEX_TOKEN_ID);
        } else {
            token = stateStore.tokens.get(payment.tokenID);
        }

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
            : valueUSD.dividedBy(totalPriceUSD).multipliedBy(100).toFixed(4);
        return new TokenDistributionModel({
            tokenId: payment.tokenID,
            percentage,
        });
    });
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
