import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { User } from 'src/helpers/userDecorator';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
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
} from './models/user.model';
import { UserMetaEsdtService } from './services/user.metaEsdt.service';

@Resolver(() => UserNftsModel)
export class UserNftsResolver extends GenericResolver {
    constructor(private readonly userMetaEsdts: UserMetaEsdtService) {
        super();
    }

    @ResolveField()
    async userLockedAssetToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedAssetToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserLockedAssetTokens(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserFarmToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserFarmTokens(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userLockedLPToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedLPToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserLockedLpTokens(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userLockedFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedFarmToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserLockedFarmTokens(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userLockedLpTokenV2(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedLPTokenV2[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserLockedLpTokensV2(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userLockedFarmTokenV2(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedFarmTokenV2[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserLockedFarmTokensV2(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userStakeFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserStakeFarmToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserStakeFarmTokens(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userUnbondFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserUnbondFarmToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserUnbondFarmTokens(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userDualYieldToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserDualYiledToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserDualYieldTokens(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userRedeemToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserRedeemToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserRedeemToken(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userLockedEsdtToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedEsdtToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserLockedEsdtToken(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userLockedSimpleLpToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedSimpleLpToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserLockedSimpleLpToken(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userLockedSimpleFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedSimpleFarmToken[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserLockedSimpleFarmToken(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @ResolveField()
    async userLockedTokenEnergy(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedTokenEnergy[]> {
        return await this.genericFieldResolver(() =>
            this.userMetaEsdts.getUserLockedTokenEnergy(
                parent.address,
                parent.pagination,
            ),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserNftsModel)
    async userNfts(
        @Args() pagination: PaginationArgs,
        @User() user: any,
    ): Promise<UserNftsModel> {
        return new UserNftsModel(user.publicKey, pagination);
    }
}
