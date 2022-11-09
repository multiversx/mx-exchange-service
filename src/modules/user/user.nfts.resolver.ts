import { UseGuards } from '@nestjs/common';
import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { User } from 'src/helpers/userDecorator';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
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
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserLockedAssetTokens(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserFarmToken[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserFarmTokens(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userLockedLPToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedLPToken[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserLockedLpTokens(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userLockedFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedFarmToken[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserLockedFarmTokens(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userLockedLpTokenV2(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedLPTokenV2[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserLockedLpTokensV2(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userLockedFarmTokenV2(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedFarmTokenV2[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserLockedFarmTokensV2(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userStakeFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserStakeFarmToken[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserStakeFarmTokens(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userUnbondFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserUnbondFarmToken[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserUnbondFarmTokens(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userDualYieldToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserDualYiledToken[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserDualYieldTokens(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userRedeemToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserRedeemToken[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserRedeemToken(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userLockedEsdtToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedEsdtToken[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserLockedEsdtToken(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userLockedSimpleLpToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedSimpleLpToken[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserLockedSimpleLpToken(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userLockedSimpleFarmToken(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedSimpleFarmToken[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserLockedSimpleFarmToken(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @ResolveField()
    async userLockedTokenEnergy(
        @Parent() parent: UserNftsModel,
    ): Promise<UserLockedTokenEnergy[]> {
        return await this.genericFieldResover(() =>
            this.userMetaEsdts.getUserLockedTokenEnergy(parent.address, {
                offset: 0,
                limit: 100,
            }),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserNftsModel)
    async userNfts(@User() user: any): Promise<UserNftsModel> {
        return new UserNftsModel(user.publicKey);
    }
}
