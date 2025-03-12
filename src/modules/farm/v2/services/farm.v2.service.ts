import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CacheService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { FarmServiceBase } from '../../base-module/services/farm.base.service';
import { FarmAbiServiceV2 } from './farm.v2.abi.service';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { BoostedRewardsModel, RewardsModel } from '../../models/farm.model';
import { FarmTokenAttributesModelV2 } from '../../models/farmTokenAttributes.model';
import { FarmComputeServiceV2 } from './farm.v2.compute.service';
import { FarmTokenAttributesV2 } from '@multiversx/sdk-exchange';
import BigNumber from 'bignumber.js';
import {
    ClaimProgress,
    UserInfoByWeekModel,
} from '../../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { constantsConfig } from '../../../../config';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class FarmServiceV2 extends FarmServiceBase {
    constructor(
        protected readonly farmAbi: FarmAbiServiceV2,
        @Inject(forwardRef(() => FarmComputeServiceV2))
        protected readonly farmCompute: FarmComputeServiceV2,
        protected readonly contextGetter: ContextGetterService,
        protected readonly cachingService: CacheService,
        protected readonly tokenService: TokenService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {
        super(
            farmAbi,
            farmCompute,
            contextGetter,
            cachingService,
            tokenService,
        );
    }

    async getBatchRewardsForPosition(
        positions: CalculateRewardsArgs[],
    ): Promise<RewardsModel[]> {
        const boostedPositions = new Map<string, CalculateRewardsArgs>();
        positions.forEach((position) => {
            let boostedPosition =
                boostedPositions.get(position.farmAddress) ?? position;
            if (
                new BigNumber(position.liquidity).isGreaterThan(
                    boostedPosition.liquidity,
                )
            ) {
                boostedPosition = position;
            }
            boostedPositions.set(position.farmAddress, boostedPosition);
        });

        const promises = positions.map((position) =>
            this.getRewardsForPosition(
                position,
                boostedPositions.get(position.farmAddress) === position,
            ),
        );
        return Promise.all(promises);
    }

    async getRewardsForPosition(
        positon: CalculateRewardsArgs,
        computeBoosted = false,
    ): Promise<RewardsModel> {
        const farmTokenAttributes = FarmTokenAttributesV2.fromAttributes(
            positon.attributes,
        );
        let rewards: BigNumber;
        if (positon.vmQuery) {
            rewards = await this.farmAbi.calculateRewardsForGivenPosition(
                positon,
            );
        } else {
            rewards = await this.farmCompute.computeFarmRewardsForPosition(
                positon,
                farmTokenAttributes.rewardPerShare,
            );
        }

        let modelsList: UserInfoByWeekModel[] = undefined;
        let currentClaimProgress: ClaimProgress = undefined;
        let userAccumulatedRewards: string = undefined;
        if (computeBoosted) {
            const currentWeek = await this.weekTimekeepingAbi.currentWeek(
                positon.farmAddress,
            );
            modelsList = [];
            let lastActiveWeekUser =
                await this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
                    positon.farmAddress,
                    positon.user,
                );
            if (lastActiveWeekUser === 0) {
                lastActiveWeekUser = currentWeek;
            }
            const startWeek = Math.max(
                currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS,
                lastActiveWeekUser,
            );

            for (let week = startWeek; week <= currentWeek - 1; week++) {
                if (week < 1) {
                    continue;
                }
                const model = new UserInfoByWeekModel({
                    scAddress: positon.farmAddress,
                    userAddress: positon.user,
                    week: week,
                });
                model.positionAmount = positon.liquidity;
                modelsList.push(model);
            }

            currentClaimProgress =
                await this.weeklyRewardsSplittingAbi.currentClaimProgress(
                    positon.farmAddress,
                    positon.user,
                );

            userAccumulatedRewards =
                await this.farmCompute.userAccumulatedRewards(
                    positon.farmAddress,
                    positon.user,
                    currentWeek,
                );
        }

        return new RewardsModel({
            identifier: positon.identifier,
            remainingFarmingEpochs: await this.getRemainingFarmingEpochs(
                positon.farmAddress,
                farmTokenAttributes.enteringEpoch,
            ),
            rewards: rewards.integerValue().toFixed(),
            boostedRewardsWeeklyInfo: modelsList,
            claimProgress: currentClaimProgress,
            accumulatedRewards: userAccumulatedRewards,
        });
    }

    async getFarmBoostedRewardsBatch(
        farmsAddresses: string[],
        userAddress: string,
    ): Promise<BoostedRewardsModel[]> {
        const promises = farmsAddresses.map((address) =>
            this.getFarmBoostedRewards(address, userAddress),
        );

        return Promise.all(promises);
    }

    async getFarmBoostedRewards(
        farmAddress: string,
        userAddress: string,
    ): Promise<BoostedRewardsModel> {
        const modelsList: UserInfoByWeekModel[] = [];

        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            farmAddress,
        );

        let lastActiveWeekUser =
            await this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
                farmAddress,
                userAddress,
            );
        if (lastActiveWeekUser === 0) {
            lastActiveWeekUser = currentWeek;
        }
        const startWeek = Math.max(
            currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS,
            lastActiveWeekUser,
        );

        for (let week = startWeek; week <= currentWeek - 1; week++) {
            if (week < 1) {
                continue;
            }

            const model = new UserInfoByWeekModel({
                scAddress: farmAddress,
                userAddress: userAddress,
                week: week,
            });
            modelsList.push(model);
        }

        const currentClaimProgress =
            await this.weeklyRewardsSplittingAbi.currentClaimProgress(
                farmAddress,
                userAddress,
            );

        const userAccumulatedRewards =
            await this.farmCompute.userAccumulatedRewards(
                farmAddress,
                userAddress,
                currentWeek,
            );

        return new BoostedRewardsModel({
            farmAddress,
            userAddress,
            boostedRewardsWeeklyInfo: modelsList,
            claimProgress: currentClaimProgress,
            accumulatedRewards: userAccumulatedRewards,
        });
    }

    decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModelV2 {
        return new FarmTokenAttributesModelV2({
            ...FarmTokenAttributesV2.fromAttributes(attributes).toJSON(),
            attributes: attributes,
            identifier: identifier,
        });
    }
}
