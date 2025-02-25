import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { BoostedYieldsFactors, FarmModelV2 } from '../models/farm.v2.model';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmServiceV2 } from './services/farm.v2.service';
import { GlobalInfoByWeekModel } from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeekTimekeepingModel } from '../../../submodules/week-timekeeping/models/week-timekeeping.model';
import { FarmComputeServiceV2 } from './services/farm.v2.compute.service';
import { constantsConfig } from '../../../config';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { FarmAbiServiceV2 } from './services/farm.v2.abi.service';
import { Inject, UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from 'src/modules/auth/jwt.or.native.auth.guard';
import { UserAuthResult } from 'src/modules/auth/user.auth.result';
import { AuthUser } from 'src/modules/auth/auth.user';
import { farmVersion } from 'src/utils/farm.utils';
import {
    BoostedRewardsModel,
    FarmVersion,
    UserTotalBoostedPosition,
} from '../models/farm.model';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { FarmAbiLoaderV2 } from './services/farm.v2.abi.loader';
import { FarmComputeLoaderV2 } from './services/farm.v2.compute.loader';

@Resolver(() => BoostedRewardsModel)
export class FarmBoostedRewardsResolver {
    constructor(private readonly farmCompute: FarmComputeServiceV2) {}

    @ResolveField()
    async estimatedWeeklyRewards(
        @Parent() parent: BoostedRewardsModel,
        @Args('additionalUserFarmAmount', {
            type: () => String,
            nullable: true,
            defaultValue: '0',
        })
        additionalUserFarmAmount: string,
        @Args('additionalUserEnergy', {
            type: () => String,
            nullable: true,
            defaultValue: '0',
        })
        additionalUserEnergy: string,
    ): Promise<string> {
        return this.farmCompute.computeUserEstimatedWeeklyRewards(
            parent.farmAddress,
            parent.userAddress,
            additionalUserFarmAmount,
            additionalUserEnergy,
        );
    }

    @ResolveField()
    async curentBoostedAPR(
        @Parent() parent: BoostedRewardsModel,
        @Args('additionalUserFarmAmount', {
            type: () => String,
            nullable: true,
            defaultValue: '0',
        })
        additionalUserFarmAmount: string,
        @Args('additionalUserEnergy', {
            type: () => String,
            nullable: true,
            defaultValue: '0',
        })
        additionalUserEnergy: string,
    ): Promise<number> {
        return this.farmCompute.computeUserCurentBoostedAPR(
            parent.farmAddress,
            parent.userAddress,
            additionalUserFarmAmount,
            additionalUserEnergy,
        );
    }

    @ResolveField()
    async maximumBoostedAPR(
        @Parent() parent: BoostedRewardsModel,
        @Args('additionalUserFarmAmount', {
            type: () => String,
            nullable: true,
            defaultValue: '0',
        })
        additionalUserFarmAmount: string,
    ): Promise<number> {
        return this.farmCompute.computeUserMaxBoostedAPR(
            parent.farmAddress,
            parent.userAddress,
            additionalUserFarmAmount,
        );
    }
}

@Resolver(() => FarmModelV2)
export class FarmResolverV2 extends FarmResolver {
    constructor(
        protected readonly farmAbi: FarmAbiServiceV2,
        protected readonly farmService: FarmServiceV2,
        protected readonly farmCompute: FarmComputeServiceV2,
        protected readonly farmAbiLoader: FarmAbiLoaderV2,
        protected readonly farmComputeLoader: FarmComputeLoaderV2,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {
        super(
            farmAbi,
            farmService,
            farmCompute,
            farmAbiLoader,
            farmComputeLoader,
            logger,
        );
    }

    @ResolveField()
    async accumulatedRewards(
        @Parent() parent: FarmModelV2,
        @Args('week', { nullable: true }) week: number,
    ): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return this.farmAbi.accumulatedRewardsForWeek(
            parent.address,
            week ?? currentWeek,
        );
    }

    @ResolveField()
    async optimalEnergyPerLp(parent: FarmModelV2): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return this.farmCompute.optimalEnergyPerLP(parent.address, currentWeek);
    }

    @ResolveField()
    async baseApr(parent: FarmModelV2): Promise<string> {
        return this.farmCompute.farmBaseAPR(parent.address);
    }

    @ResolveField()
    async boostedApr(parent: FarmModelV2): Promise<string> {
        return this.farmCompute.maxBoostedApr(parent.address);
    }

    @ResolveField()
    async boosterRewards(
        parent: FarmModelV2,
    ): Promise<GlobalInfoByWeekModel[]> {
        const modelsList = [];
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        for (
            let week = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS;
            week <= currentWeek;
            week++
        ) {
            if (week < 1) {
                continue;
            }
            modelsList.push(
                new GlobalInfoByWeekModel({
                    scAddress: parent.address,
                    week: week,
                }),
            );
        }
        return modelsList;
    }

    @ResolveField()
    async time(parent: FarmModelV2): Promise<WeekTimekeepingModel> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return new WeekTimekeepingModel({
            scAddress: parent.address,
            currentWeek: currentWeek,
        });
    }

    @ResolveField()
    async boostedYieldsRewardsPercenatage(
        parent: FarmModelV2,
    ): Promise<number> {
        return this.farmAbi.boostedYieldsRewardsPercenatage(parent.address);
    }

    @ResolveField()
    async boostedYieldsFactors(
        parent: FarmModelV2,
    ): Promise<BoostedYieldsFactors> {
        return this.farmAbi.boostedYieldsFactors(parent.address);
    }

    @ResolveField()
    async lockingScAddress(parent: FarmModelV2): Promise<string> {
        return this.farmAbi.lockingScAddress(parent.address);
    }

    @ResolveField()
    async lockEpochs(parent: FarmModelV2): Promise<number> {
        return this.farmAbi.lockEpochs(parent.address);
    }

    @ResolveField()
    async undistributedBoostedRewards(parent: FarmModelV2): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return this.farmCompute.undistributedBoostedRewards(
            parent.address,
            currentWeek,
        );
    }

    @ResolveField()
    async undistributedBoostedRewardsClaimed(
        parent: FarmModelV2,
    ): Promise<string> {
        return this.farmAbi.undistributedBoostedRewards(parent.address);
    }

    @ResolveField()
    async lastGlobalUpdateWeek(parent: FarmModelV2): Promise<number> {
        return this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeek(
            parent.address,
        );
    }

    @ResolveField()
    async energyFactoryAddress(parent: FarmModelV2): Promise<string> {
        return this.farmAbi.energyFactoryAddress(parent.address);
    }

    @ResolveField()
    async farmTokenSupplyCurrentWeek(parent: FarmModelV2): Promise<string> {
        const week = await this.weekTimekeepingAbi.currentWeek(parent.address);
        return this.farmAbi.farmSupplyForWeek(parent.address, week);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [UserTotalBoostedPosition], {
        description: 'Returns the total farm position of the user in the farm',
    })
    async userTotalFarmPosition(
        @Args('farmsAddresses', { type: () => [String] })
        farmsAddresses: string[],
        @AuthUser() user: UserAuthResult,
    ): Promise<UserTotalBoostedPosition[]> {
        farmsAddresses.forEach((farmAddress) => {
            if (farmVersion(farmAddress) !== FarmVersion.V2) {
                throw new GraphQLError('Farm version is not supported', {
                    extensions: {
                        code: ApolloServerErrorCode.BAD_USER_INPUT,
                    },
                });
            }
        });

        const positions = await Promise.all(
            farmsAddresses.map((farmAddress) =>
                this.farmAbi.userTotalFarmPosition(farmAddress, user.address),
            ),
        );

        return farmsAddresses.map((farmAddress, index) => {
            return new UserTotalBoostedPosition({
                address: farmAddress,
                boostedTokensAmount: positions[index],
            });
        });
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [BoostedRewardsModel], { nullable: true })
    async getFarmBoostedRewardsBatch(
        @Args('farmsAddresses', { type: () => [String] })
        farmsAddresses: string[],
        @AuthUser() user: UserAuthResult,
    ): Promise<BoostedRewardsModel[]> {
        return this.farmService.getFarmBoostedRewardsBatch(
            farmsAddresses,
            user.address,
        );
    }
}
