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
import { ContextGetterService } from 'src/services/context/context.getter.service';

@Resolver(() => UserNftsModel)
export class UserNftsResolver {
    constructor(
        private readonly userMetaEsdts: UserMetaEsdtService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    @ResolveField()
    async userLockedAssetToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedAssetToken[]> {
        return this.userMetaEsdts.getUserLockedAssetTokens(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserFarmToken[]> {
        return this.userMetaEsdts.getUserFarmTokens(
            parent.address,
            parent.pagination,
            true,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userLockedLPToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedLPToken[]> {
        return this.userMetaEsdts.getUserLockedLpTokens(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userLockedFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedFarmToken[]> {
        return this.userMetaEsdts.getUserLockedFarmTokens(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userLockedLpTokenV2(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedLPTokenV2[]> {
        return this.userMetaEsdts.getUserLockedLpTokensV2(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userLockedFarmTokenV2(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedFarmTokenV2[]> {
        return this.userMetaEsdts.getUserLockedFarmTokensV2(
            parent.address,
            parent.pagination,
            true,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userStakeFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserStakeFarmToken[]> {
        return this.userMetaEsdts.getUserStakeFarmTokens(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userUnbondFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserUnbondFarmToken[]> {
        return this.userMetaEsdts.getUserUnbondFarmTokens(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userDualYieldToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserDualYiledToken[]> {
        return this.userMetaEsdts.getUserDualYieldTokens(
            parent.address,
            parent.pagination,
            true,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userRedeemToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserRedeemToken[]> {
        return this.userMetaEsdts.getUserRedeemToken(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userLockedEsdtToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedEsdtToken[]> {
        return this.userMetaEsdts.getUserLockedEsdtToken(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userLockedSimpleLpToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedSimpleLpToken[]> {
        return this.userMetaEsdts.getUserLockedSimpleLpToken(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userLockedSimpleFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedSimpleFarmToken[]> {
        return this.userMetaEsdts.getUserLockedSimpleFarmToken(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userLockedTokenEnergy(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedTokenEnergy[]> {
        return this.userMetaEsdts.getUserLockedTokenEnergy(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @ResolveField()
    async userWrappedLockedToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserWrappedLockedToken[]> {
        return this.userMetaEsdts.getUserWrappedLockedTokenEnergy(
            parent.address,
            parent.pagination,
            parent.rawNfts,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => UserNftsModel)
    async userNfts(
        @Args() pagination: PaginationArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<UserNftsModel> {
        const nfts = await this.contextGetter.getNftsForUser(
            user.address,
            pagination.offset,
            pagination.limit,
            'MetaESDT',
        );

        return new UserNftsModel(user.address, pagination, nfts);
    }
}
