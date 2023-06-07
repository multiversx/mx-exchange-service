import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { PaginationArgs } from '../dex.model';
import {
    UserDualYiledToken,
    UserFarmToken,
    UserLockedAssetToken,
    UserLockedEsdtToken,
    UserLockedFarmToken,
    UserLockedFarmTokenV2,
    UserLockedLPToken,
    UserLockedLPTokenV2,
    UserLockedSimpleFarmToken,
    UserLockedSimpleLpToken,
    UserLockedTokenEnergy,
    UserNftsModel,
    UserRedeemToken,
    UserStakeFarmToken,
    UserUnbondFarmToken,
    UserWrappedLockedToken,
} from './models/user.model';
import { UserMetaEsdtService } from './services/user.metaEsdt.service';

@Resolver(() => UserNftsModel)
export class UserNftsResolver {
    constructor(private readonly userMetaEsdts: UserMetaEsdtService) {}

    @ResolveField()
    async userLockedAssetToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedAssetToken[]> {
        return this.userMetaEsdts.getUserLockedAssetTokens(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserFarmToken[]> {
        return this.userMetaEsdts.getUserFarmTokens(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userLockedLPToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedLPToken[]> {
        return this.userMetaEsdts.getUserLockedLpTokens(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userLockedFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedFarmToken[]> {
        return this.userMetaEsdts.getUserLockedFarmTokens(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userLockedLpTokenV2(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedLPTokenV2[]> {
        return this.userMetaEsdts.getUserLockedLpTokensV2(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userLockedFarmTokenV2(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedFarmTokenV2[]> {
        return this.userMetaEsdts.getUserLockedFarmTokensV2(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userStakeFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserStakeFarmToken[]> {
        return this.userMetaEsdts.getUserStakeFarmTokens(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userUnbondFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserUnbondFarmToken[]> {
        return this.userMetaEsdts.getUserUnbondFarmTokens(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userDualYieldToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserDualYiledToken[]> {
        return this.userMetaEsdts.getUserDualYieldTokens(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userRedeemToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserRedeemToken[]> {
        return this.userMetaEsdts.getUserRedeemToken(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userLockedEsdtToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedEsdtToken[]> {
        return this.userMetaEsdts.getUserLockedEsdtToken(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userLockedSimpleLpToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedSimpleLpToken[]> {
        return this.userMetaEsdts.getUserLockedSimpleLpToken(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userLockedSimpleFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedSimpleFarmToken[]> {
        return this.userMetaEsdts.getUserLockedSimpleFarmToken(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userLockedTokenEnergy(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedTokenEnergy[]> {
        return this.userMetaEsdts.getUserLockedTokenEnergy(
            parent.address,
            parent.pagination,
        );
    }

    @ResolveField()
    async userWrappedLockedToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserWrappedLockedToken[]> {
        return this.userMetaEsdts.getUserWrappedLockedTokenEnergy(
            parent.address,
            parent.pagination,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => UserNftsModel)
    async userNfts(
        @Args() pagination: PaginationArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<UserNftsModel> {
        return new UserNftsModel(user.address, pagination);
    }
}
