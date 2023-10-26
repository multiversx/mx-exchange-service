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
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from 'src/modules/auth/jwt.or.native.auth.guard';
import { UserAuthResult } from 'src/modules/auth/user.auth.result';
import { AuthUser } from 'src/modules/auth/auth.user';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from '../models/farm.model';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver(() => FarmModelV2)
export class FarmResolverV2 extends FarmResolver {
    constructor(
        protected readonly farmAbi: FarmAbiServiceV2,
        protected readonly farmService: FarmServiceV2,
        protected readonly farmCompute: FarmComputeServiceV2,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {
        super(farmAbi, farmService, farmCompute);
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
    async optimalEnergyPerLp(@Parent() parent: FarmModelV2): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return this.farmCompute.optimalEnergyPerLP(parent.address, currentWeek);
    }

    @ResolveField()
    async baseApr(@Parent() parent: FarmModelV2): Promise<string> {
        return this.farmCompute.farmBaseAPR(parent.address);
    }

    @ResolveField()
    async boosterRewards(
        @Parent() parent: FarmModelV2,
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
    async time(@Parent() parent: FarmModelV2): Promise<WeekTimekeepingModel> {
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
        @Parent() parent: FarmModelV2,
    ): Promise<number> {
        return this.farmAbi.boostedYieldsRewardsPercenatage(parent.address);
    }

    @ResolveField()
    async boostedYieldsFactors(
        @Parent() parent: FarmModelV2,
    ): Promise<BoostedYieldsFactors> {
        return this.farmAbi.boostedYieldsFactors(parent.address);
    }

    @ResolveField()
    async lockingScAddress(@Parent() parent: FarmModelV2): Promise<string> {
        return this.farmAbi.lockingScAddress(parent.address);
    }

    @ResolveField()
    async lockEpochs(@Parent() parent: FarmModelV2): Promise<number> {
        return this.farmAbi.lockEpochs(parent.address);
    }

    @ResolveField()
    async undistributedBoostedRewards(
        @Parent() parent: FarmModelV2,
    ): Promise<string> {
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
        @Parent() parent: FarmModelV2,
    ): Promise<string> {
        return this.farmAbi.undistributedBoostedRewards(parent.address);
    }

    @ResolveField()
    async lastGlobalUpdateWeek(@Parent() parent: FarmModelV2): Promise<number> {
        return this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeek(
            parent.address,
        );
    }

    @ResolveField()
    async energyFactoryAddress(@Parent() parent: FarmModelV2): Promise<string> {
        return this.farmAbi.energyFactoryAddress(parent.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => String, {
        description: 'Returns the total farm position of the user in the farm',
    })
    async userTotalFarmPosition(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<string> {
        if (farmVersion(farmAddress) !== FarmVersion.V2) {
            throw new GraphQLError('Farm version is not supported', {
                extensions: {
                    code: ApolloServerErrorCode.BAD_USER_INPUT,
                },
            });
        }
        return this.farmAbi.userTotalFarmPosition(farmAddress, user.address);
    }
}
