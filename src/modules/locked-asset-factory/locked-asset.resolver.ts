import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { LockedAssetService } from './services/locked-asset.service';
import {
    LockedAssetAttributesModel,
    LockedAssetModel,
    UnlockMileStoneModel,
} from './models/locked-asset.model';
import { UnlockAssetsArgs } from './models/locked-asset.args';
import { TransactionsLockedAssetService } from './services/transaction-locked-asset.service';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import { ApolloError } from 'apollo-server-express';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { InputTokenModel } from 'src/models/inputToken.model';
import { LockedAssetGetterService } from './services/locked.asset.getter.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

@Resolver(() => LockedAssetModel)
export class LockedAssetResolver {
    constructor(
        private readonly lockedAssetService: LockedAssetService,
        private readonly lockedAssetGetter: LockedAssetGetterService,
        private readonly transactionsService: TransactionsLockedAssetService,
    ) {}

    @ResolveField()
    async assetToken(): Promise<EsdtToken> {
        try {
            return await this.lockedAssetGetter.getAssetToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedToken(): Promise<NftCollection> {
        try {
            return await this.lockedAssetGetter.getLockedToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async unlockMilestones(): Promise<UnlockMileStoneModel[]> {
        try {
            return await this.lockedAssetGetter.getDefaultUnlockPeriod();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async activationNonce(): Promise<number> {
        try {
            return await this.lockedAssetGetter.getExtendedAttributesActivationNonce();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => LockedAssetModel)
    async lockedAssetFactory(): Promise<LockedAssetModel> {
        return await this.lockedAssetService.getLockedAssetInfo();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async lockAssets(
        @Args('inputToken') inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        return await this.transactionsService.lockAssets(inputToken);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unlockAssets(
        @Args() args: UnlockAssetsArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.transactionsService.unlockAssets(user.address, args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeLockedAssetTokens(
        @Args('tokens', { type: () => [InputTokenModel] })
        tokens: InputTokenModel[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionsService.mergeLockedAssetTokens(
                user.address,
                tokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [LockedAssetAttributesModel])
    async decodeLockedAssetAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<LockedAssetAttributesModel[]> {
        return this.lockedAssetService.decodeLockedAssetAttributes(args);
    }
}
