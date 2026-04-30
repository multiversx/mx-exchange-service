import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmModelV2 } from '../models/farm.v2.model';
import { FarmServiceV2 } from './services/farm.v2.service';
import { FarmComputeServiceV2 } from './services/farm.v2.compute.service';
import { FarmAbiServiceV2 } from './services/farm.v2.abi.service';
import { UseGuards } from '@nestjs/common';
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
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { StateDataLoader } from 'src/modules/state/services/state.dataloader';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { PairModel } from 'src/modules/pair/models/pair.model';

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
export class FarmResolverV2 {
    constructor(
        protected readonly farmAbi: FarmAbiServiceV2,
        protected readonly farmService: FarmServiceV2,
        protected readonly stateDataLoader: StateDataLoader,
    ) {}

    @ResolveField()
    async farmedToken(parent: FarmModelV2): Promise<EsdtToken> {
        return this.stateDataLoader.loadToken(parent.farmedTokenId);
    }

    @ResolveField()
    async farmToken(parent: FarmModelV2): Promise<NftCollection> {
        return this.stateDataLoader.loadNft(parent.farmTokenCollection);
    }

    @ResolveField()
    async farmingToken(parent: FarmModelV2): Promise<EsdtToken> {
        return this.stateDataLoader.loadToken(parent.farmingTokenId);
    }

    @ResolveField()
    async pair(parent: FarmModelV2): Promise<PairModel> {
        if (parent.pairAddress) {
            return this.stateDataLoader.loadPair(parent.pairAddress);
        }
    }

    @ResolveField()
    async accumulatedRewards(
        @Parent() parent: FarmModelV2,
        @Args('week', { nullable: true }) week: number,
    ): Promise<string> {
        if (!week || week === parent.time.currentWeek) {
            return parent.accumulatedRewards;
        }

        return this.farmAbi.accumulatedRewardsForWeek(parent.address, week);
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
