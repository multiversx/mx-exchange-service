import {
    StakingFarmTokenAttributes,
    UnbondFarmTokenAttributes,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { CalculateRewardsArgs } from 'src/modules/farm/models/farm.args';
import { DecodeAttributesArgs } from 'src/modules/proxy/models/proxy.args';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import {
    StakingBoostedRewardsModel,
    StakingModel,
    StakingRewardsModel,
} from '../models/staking.model';
import {
    StakingTokenAttributesModel,
    UnbondTokenAttributesModel,
} from '../models/stakingTokenAttributes.model';
import { StakingAbiService } from './staking.abi.service';
import { StakingComputeService } from './staking.compute.service';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import {
    ClaimProgress,
    UserInfoByWeekModel,
} from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { constantsConfig } from 'src/config';
import { CollectionType } from 'src/modules/common/collection.type';
import { PaginationArgs } from 'src/modules/dex.model';
import {
    StakingFarmsFilter,
    StakingFarmsSortingArgs,
} from '../models/staking.args';
import { StakingStateService } from 'src/modules/state/services/staking.state.service';

@Injectable()
export class StakingService {
    constructor(
        private readonly stakingAbi: StakingAbiService,
        @Inject(forwardRef(() => StakingComputeService))
        private readonly stakingCompute: StakingComputeService,
        private readonly contextGetter: ContextGetterService,
        private readonly tokenService: TokenService,
        private readonly apiService: MXApiService,
        private readonly remoteConfigGetter: RemoteConfigGetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly stakingState: StakingStateService,
    ) {}

    async getFarmsStaking(
        fields: (keyof StakingModel)[] = [],
    ): Promise<StakingModel[]> {
        return this.stakingState.getAllStakingFarms(fields);
    }

    async getFilteredFarmsStaking(
        pagination: PaginationArgs,
        filters: StakingFarmsFilter,
        sorting: StakingFarmsSortingArgs,
    ): Promise<CollectionType<StakingModel>> {
        const { offset, limit } = pagination;

        const result = await this.stakingState.getFilteredStakingFarms(
            offset,
            limit,
            filters,
            sorting,
        );

        return new CollectionType({
            count: result.count,
            items: result.stakingFarms,
        });
    }

    async getFarmToken(stakeAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.stakingAbi.farmTokenID(stakeAddress);
        return this.tokenService.getNftCollectionMetadata(farmTokenID);
    }

    async getFarmingToken(stakeAddress: string): Promise<EsdtToken> {
        const farmingTokenID = await this.stakingAbi.farmingTokenID(
            stakeAddress,
        );
        return this.tokenService.tokenMetadata(farmingTokenID);
    }

    decodeStakingTokenAttributes(
        args: DecodeAttributesArgs,
    ): StakingTokenAttributesModel[] {
        return args.batchAttributes.map((arg) => {
            return new StakingTokenAttributesModel({
                ...StakingFarmTokenAttributes.fromAttributes(
                    arg.attributes,
                ).toJSON(),
                attributes: arg.attributes,
                identifier: arg.identifier,
            });
        });
    }

    async decodeUnboundTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<UnbondTokenAttributesModel[]> {
        return Promise.all(
            args.batchAttributes.map(async (arg) => {
                const unboundFarmTokenAttributes =
                    UnbondFarmTokenAttributes.fromAttributes(arg.attributes);
                const remainingEpochs = await this.getUnbondigRemaingEpochs(
                    unboundFarmTokenAttributes.unlockEpoch,
                );

                return new UnbondTokenAttributesModel({
                    ...unboundFarmTokenAttributes.toJSON(),
                    remainingEpochs,
                    attributes: arg.attributes,
                    identifier: arg.identifier,
                });
            }),
        );
    }

    async getBatchRewardsForPosition(
        positions: CalculateRewardsArgs[],
        computeBoosted = false,
    ): Promise<StakingRewardsModel[]> {
        const [stakingFarms, currentNonce] = await Promise.all([
            this.stakingState.getStakingFarms(
                positions.map((position) => position.farmAddress),
                [
                    'address',
                    'time',
                    'rewardPerShare',
                    'farmTokenSupply',
                    'divisionSafetyConstant',
                    'accumulatedRewards',
                    'rewardCapacity',
                    'lastRewardBlockNonce',
                    'perBlockRewards',
                    'produceRewardsEnabled',
                    'rewardsPerBlockAPRBound',
                ],
            ),
            this.contextGetter.getShardCurrentBlockNonce(1),
        ]);

        return Promise.all(
            positions.map((position, index) =>
                this.getRewardsForPosition(
                    stakingFarms[index],
                    position,
                    currentNonce,
                    computeBoosted,
                ),
            ),
        );
    }

    async getRewardsForPosition(
        stakingFarm: StakingModel,
        position: CalculateRewardsArgs,
        currentNonce: number,
        computeBoosted = false,
    ): Promise<StakingRewardsModel> {
        const stakeTokenAttributes = this.decodeStakingTokenAttributes({
            batchAttributes: [
                {
                    attributes: position.attributes,
                    identifier: position.identifier,
                },
            ],
        });
        let rewards: BigNumber;
        if (position.vmQuery) {
            rewards = await this.stakingAbi.calculateRewardsForGivenPosition(
                position.farmAddress,
                position.liquidity,
                position.attributes,
            );
        } else {
            rewards = this.stakingCompute.computeStakeRewardsForPosition(
                stakingFarm,
                position.liquidity,
                stakeTokenAttributes[0],
                currentNonce,
            );
        }

        let modelsList: UserInfoByWeekModel[] = undefined;
        let currentClaimProgress: ClaimProgress = undefined;
        let userAccumulatedRewards: string = undefined;
        if (computeBoosted) {
            const currentWeek = stakingFarm.time.currentWeek;

            let lastActiveWeekUser = 0;
            modelsList = [];

            [lastActiveWeekUser, currentClaimProgress] = await Promise.all([
                this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
                    position.farmAddress,
                    position.user,
                ),
                this.weeklyRewardsSplittingAbi.currentClaimProgress(
                    position.farmAddress,
                    position.user,
                ),
            ]);

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
                    scAddress: position.farmAddress,
                    userAddress: position.user,
                    week: week,
                });
                model.positionAmount = position.liquidity;
                modelsList.push(model);
            }

            userAccumulatedRewards =
                await this.stakingCompute.userAccumulatedRewards(
                    position.farmAddress,
                    position.user,
                    currentWeek,
                );
        }

        return new StakingRewardsModel({
            decodedAttributes: stakeTokenAttributes[0],
            rewards: rewards.integerValue().toFixed(),
            boostedRewardsWeeklyInfo: modelsList,
            claimProgress: currentClaimProgress,
            accumulatedRewards: userAccumulatedRewards,
        });
    }

    async getStakingBoostedRewardsBatch(
        stakingAddresses: string[],
        userAddress: string,
    ): Promise<StakingBoostedRewardsModel[]> {
        const promises = stakingAddresses.map((address) =>
            this.getStakingBoostedRewards(address, userAddress),
        );
        return Promise.all(promises);
    }

    async getStakingBoostedRewards(
        stakingAddress: string,
        userAddress: string,
    ): Promise<StakingBoostedRewardsModel> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            stakingAddress,
        );
        const modelsList = [];
        let lastActiveWeekUser =
            await this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
                stakingAddress,
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
                scAddress: stakingAddress,
                userAddress: userAddress,
                week: week,
            });

            modelsList.push(model);
        }

        const currentClaimProgress =
            await this.weeklyRewardsSplittingAbi.currentClaimProgress(
                stakingAddress,
                userAddress,
            );

        const userAccumulatedRewards =
            await this.stakingCompute.userAccumulatedRewards(
                stakingAddress,
                userAddress,
                currentWeek,
            );

        return new StakingBoostedRewardsModel({
            farmAddress: stakingAddress,
            userAddress: userAddress,
            boostedRewardsWeeklyInfo: modelsList,
            claimProgress: currentClaimProgress,
            accumulatedRewards: userAccumulatedRewards,
        });
    }

    private async getUnbondigRemaingEpochs(
        unlockEpoch: number,
    ): Promise<number> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        return unlockEpoch - currentEpoch > 0 ? unlockEpoch - currentEpoch : 0;
    }

    async getStakeFarmAddressByStakeFarmTokenID(
        tokenID: string,
    ): Promise<string> {
        const stakeFarmAddresses: string[] =
            await this.remoteConfigGetter.getStakingAddresses();

        for (const address of stakeFarmAddresses) {
            const stakeFarmTokenID = await this.stakingAbi.farmTokenID(address);
            if (tokenID === stakeFarmTokenID) {
                return address;
            }
        }

        return undefined;
    }

    async isWhitelisted(
        stakeAddress: string,
        address: string,
    ): Promise<boolean> {
        return this.stakingAbi.isWhitelisted(stakeAddress, address);
    }

    async requireWhitelist(
        stakeAddress: string,
        scAddress: string,
    ): Promise<void> {
        if (!(await this.stakingAbi.isWhitelisted(stakeAddress, scAddress)))
            throw new Error('SC not whitelisted.');
    }

    async requireOwner(stakeAddress: string, sender: string): Promise<void> {
        if (
            (await this.apiService.getAccountStats(stakeAddress))
                .ownerAddress !== sender
        ) {
            throw new Error('Sender is not the owner of the contract.');
        }
    }
}
