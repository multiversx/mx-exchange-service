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
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { InputTokenModel } from 'src/models/inputToken.model';
import { LockedAssetGetterService } from './services/locked.asset.getter.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

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
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    @ResolveField()
    async lockedToken(): Promise<NftCollection> {
        try {
            return await this.lockedAssetGetter.getLockedToken();
        } catch (error) {
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    @ResolveField()
    async unlockMilestones(): Promise<UnlockMileStoneModel[]> {
        try {
            return await this.lockedAssetGetter.getDefaultUnlockPeriod();
        } catch (error) {
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    @ResolveField()
    async activationNonce(): Promise<number> {
        try {
            return await this.lockedAssetGetter.getExtendedAttributesActivationNonce();
        } catch (error) {
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    @Query(() => LockedAssetModel)
    async lockedAssetFactory(): Promise<LockedAssetModel> {
        return this.lockedAssetService.getLockedAssetInfo();
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async lockAssets(
        @Args('inputToken') inputToken: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionsService.lockAssets(user.address, inputToken);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async unlockAssets(
        @Args() args: UnlockAssetsArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionsService.unlockAssets(user.address, args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
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
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [LockedAssetAttributesModel])
    async decodeLockedAssetAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<LockedAssetAttributesModel[]> {
        return this.lockedAssetService.decodeLockedAssetAttributes(args);
    }
}
