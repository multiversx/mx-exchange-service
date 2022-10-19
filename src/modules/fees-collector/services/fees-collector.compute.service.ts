import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { FeesCollectorGetterService } from "./fees-collector.getter.service";
import { WeekTimekeepingService } from "../../../submodules/week-timekeeping/services/week-timekeeping.service";
import {
    WeeklyRewardsSplittingGetterService
} from "../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service";
import { AbiRouterService } from "../../router/services/abi.router.service";
import { PairComputeService } from "../../pair/services/pair.compute.service";
import BigNumber from "bignumber.js";
import { scAddress } from "../../../config";

@Injectable()
export class FeesCollectorComputeService {
    constructor(
        @Inject(forwardRef(() => FeesCollectorGetterService))
        private readonly feesCollectorGetterService: FeesCollectorGetterService,
        private readonly weekTimekeepingService: WeekTimekeepingService,
        private readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
        private readonly routerService: AbiRouterService,
        private readonly pairCompute: PairComputeService,
    ) {
    }

    async computeTotalRewardsForWeekPriceUSD(scAddress: string, week: number): Promise<string> {
        const totalRewardsForWeek = await this.weeklyRewardsSplittingGetter.totalRewardsForWeek(scAddress, week);
        const pairs = await this.routerService.getPairsMetadata()
        let totalPriceUSD = new BigNumber("0");
        for (const pair of pairs) {
            for (const token of totalRewardsForWeek) {
                let tokenPriceUSD: string;
                switch (token.tokenID) {
                    case pair.firstTokenID:
                        tokenPriceUSD = await this.pairCompute.computeFirstTokenPriceUSD(pair.address)
                        break
                    case pair.secondTokenID:
                        tokenPriceUSD = await this.pairCompute.computeSecondTokenPriceUSD(pair.address)
                        break
                    default:
                        continue
                }
                const rewardsPriceUSD = new BigNumber(tokenPriceUSD).multipliedBy(new BigNumber(token.amount))
                totalPriceUSD = totalPriceUSD.plus(rewardsPriceUSD)
            }
        }
        return totalPriceUSD.toFixed()
    }

    async computeTotalLockedTokensForWeekPriceUSD(address: string, week: number): Promise<string> {
        const totalLockedTokensForWeek = await this.weeklyRewardsSplittingGetter.totalLockedTokensForWeek(address, week);
        const mexPrice = await this.pairCompute.computeSecondTokenPriceUSD(scAddress.MEX)
        const totalPriceUSD = new BigNumber(totalLockedTokensForWeek).multipliedBy(new BigNumber(mexPrice))
        return totalPriceUSD.toFixed()
    }

    async computeApr(scAddress: string, week: number): Promise<string> {
        const totalLockedTokensForWeekPriceUSD =
            await this.feesCollectorGetterService.getTotalLockedTokensForWeekPriceUSD(scAddress, week);
        const totalRewardsForWeekPriceUSD =
            await this.feesCollectorGetterService.getTotalRewardsForWeekPriceUSD(scAddress, week);

        return new BigNumber(totalRewardsForWeekPriceUSD)
            .times(52)
            .div(totalLockedTokensForWeekPriceUSD)
            .toFixed()
    }
}