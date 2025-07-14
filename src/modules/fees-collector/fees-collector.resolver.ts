import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
    FeesCollectorModel,
    FeesCollectorTransactionModel,
    UserEntryFeesCollectorModel,
} from './models/fees-collector.model';
import { FeesCollectorService } from './services/fees-collector.service';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { scAddress } from '../../config';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from '../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { TransactionModel } from '../../models/transaction.model';
import { FeesCollectorAbiService } from './services/fees-collector.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { FeesCollectorTransactionService } from './services/fees-collector.transaction.service';
import { FeesCollectorComputeService } from './services/fees-collector.compute.service';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { EnergyAbiService } from '../energy/services/energy.abi.service';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver {
    constructor(
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly feesCollectorCompute: FeesCollectorComputeService,
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorTransaction: FeesCollectorTransactionService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly energyAbi: EnergyAbiService,
    ) {}

    @ResolveField()
    async lastGlobalUpdateWeek(parent: FeesCollectorModel): Promise<number> {
        return this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeek(
            parent.address,
        );
    }

    @ResolveField(() => [GlobalInfoByWeekModel])
    async undistributedRewards(
        parent: FeesCollectorModel,
    ): Promise<GlobalInfoByWeekModel[]> {
        return this.feesCollectorService.getWeeklyRewardsSplit(
            parent.address,
            parent.startWeek,
            parent.endWeek,
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedFees(
        parent: FeesCollectorModel,
    ): Promise<EsdtTokenPayment[]> {
        return this.feesCollectorService.getAccumulatedFees(
            parent.address,
            parent.time.currentWeek,
            parent.allTokens,
        );
    }

    @ResolveField()
    async lockedTokenId(): Promise<string> {
        return this.energyAbi.lockedTokenID();
    }

    @ResolveField()
    async lockedTokensPerBlock(): Promise<string> {
        return this.feesCollectorCompute.lockedTokensPerBlock();
    }

    @ResolveField()
    async lockedTokensPerEpoch(): Promise<string> {
        return this.feesCollectorAbi.lockedTokensPerEpoch();
    }

    @ResolveField(() => [String])
    async allTokens(): Promise<string[]> {
        return this.feesCollectorAbi.allTokens();
    }

    @ResolveField(() => [String])
    async knownContracts(): Promise<string[]> {
        return [];
    }

    @ResolveField(() => Boolean)
    async isSCAddressWhitelisted(
        @Args('address') address: string,
    ): Promise<boolean> {
        return this.feesCollectorAbi.isSCAddressWhitelisted(address);
    }

    @ResolveField(() => Boolean)
    async allowExternalClaimRewards(
        @Args('address') address: string,
    ): Promise<boolean> {
        return this.feesCollectorAbi.allowExternalClaimRewards(address);
    }

    @Query(() => FeesCollectorModel)
    async feesCollector(): Promise<FeesCollectorModel> {
        return this.feesCollectorService.feesCollector(scAddress.feesCollector);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel, {
        description: 'Add or remove known contracts',
        deprecationReason: 'The endpoint was removed from the SC',
    })
    async handleKnownContracts(
        @Args('contractAddresses', { type: () => [String] })
        _contractAddresses: string[],
        @Args('remove', { nullable: true }) _remove: boolean,
        @AuthUser() _user: UserAuthResult,
    ): Promise<TransactionModel> {
        throw new GraphQLError('Endpoint removed from SC', {
            extensions: {
                code: ApolloServerErrorCode.BAD_REQUEST,
            },
        });
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel, {
        description: 'Add or remove address from whitelist',
    })
    async handleWhitelistedAddress(
        @Args('address', { type: () => String }) address: string,
        @Args('remove', { nullable: true }) remove: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.feesCollectorTransaction.handleWhitelistedAddress(
            user.address,
            address,
            remove,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel, {
        description: 'Add or remove reward tokens',
    })
    async handleKnownTokens(
        @Args('tokenIDs', { type: () => [String] }) tokenIDs: string[],
        @Args('remove', { nullable: true }) remove: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.feesCollectorTransaction.handleKnownTokens(
            user.address,
            tokenIDs,
            remove,
        );
    }
}

@Resolver(() => UserEntryFeesCollectorModel)
export class UserEntryFeesCollectorResolver {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorCompute: FeesCollectorComputeService,
        private readonly feesCollectorTransaction: FeesCollectorTransactionService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {}

    @ResolveField(() => [UserInfoByWeekModel])
    async undistributedRewards(
        parent: UserEntryFeesCollectorModel,
    ): Promise<UserInfoByWeekModel[]> {
        return this.feesCollectorService.getUserWeeklyRewardsSplit(
            parent.address,
            parent.userAddress,
            parent.startWeek,
            parent.endWeek,
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedRewards(
        parent: UserEntryFeesCollectorModel,
    ): Promise<EsdtTokenPayment[]> {
        return this.feesCollectorService.getUserAccumulatedRewards(
            parent.address,
            parent.userAddress,
            parent.time.currentWeek,
        );
    }

    @ResolveField()
    async lastActiveWeekForUser(
        parent: UserEntryFeesCollectorModel,
    ): Promise<number> {
        return this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
            parent.address,
            parent.userAddress,
        );
    }

    @ResolveField(() => ClaimProgress)
    async claimProgress(
        parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        return this.weeklyRewardsSplittingAbi.currentClaimProgress(
            parent.address,
            parent.userAddress,
        );
    }

    @ResolveField()
    async lastWeekRewardsUSD(
        @Parent() parent: UserEntryFeesCollectorModel,
        @Args('additionalUserEnergy', { nullable: true })
        additionalUserEnergy: string,
    ): Promise<string> {
        return this.feesCollectorCompute.computeUserLastWeekRewardsUSD(
            scAddress.feesCollector,
            parent.userAddress,
            additionalUserEnergy,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => UserEntryFeesCollectorModel)
    async userFeesCollector(
        @AuthUser() user: UserAuthResult,
    ): Promise<UserEntryFeesCollectorModel> {
        return this.feesCollectorService.userFeesCollector(
            scAddress.feesCollector,
            user.address,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => FeesCollectorTransactionModel)
    async claimFeesRewards(
        @AuthUser() user: UserAuthResult,
    ): Promise<FeesCollectorTransactionModel> {
        return this.feesCollectorTransaction.claimRewardsBatch(
            scAddress.feesCollector,
            user.address,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async updateEnergyForUser(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.feesCollectorTransaction.updateEnergyForUser(user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => String)
    async userLastWeekRewards(
        @AuthUser() user: UserAuthResult,
        @Args('energyAmount', { nullable: true })
        energyAmount: string,
        @Args('lockedTokens', { nullable: true })
        lockedTokens: string,
    ): Promise<string> {
        const apr = await this.feesCollectorCompute.computeUserRewardsAPR(
            scAddress.feesCollector,
            user.address,
            energyAmount,
            lockedTokens,
        );
        return apr.toFixed(4);
    }
}
