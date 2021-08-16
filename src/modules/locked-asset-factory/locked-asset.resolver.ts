import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { LockedAssetService } from './locked-asset.service';
import {
    LockedAssetAttributes,
    LockedAssetModel,
    UnlockMileStoneModel,
} from './models/locked-asset.model';
import { UnlockAssetsArs } from './models/locked-asset.args';
import { TransactionsLockedAssetService } from './transaction-locked-asset.service';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { TokenMergingService } from '../token-merging/token.merging.service';
import { TokenMergingTransactionsService } from '../token-merging/token.merging.transactions.service';
import {
    TokensMergingArgs,
    SmartContractType,
} from '../token-merging/dto/token.merging.args';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import { JwtAuthenticateGuard } from '../../helpers/guards/jwt.authenticate.guard';
import { ApolloError } from 'apollo-server-express';

@Resolver(of => LockedAssetModel)
export class LockedAssetResolver {
    constructor(
        @Inject(LockedAssetService)
        private readonly lockedAssetService: LockedAssetService,
        @Inject(TransactionsLockedAssetService)
        private readonly transactionsService: TransactionsLockedAssetService,
        @Inject(TokenMergingService)
        private readonly mergeTokensService: TokenMergingService,
        @Inject(TokenMergingTransactionsService)
        private readonly mergeTokensTransactions: TokenMergingTransactionsService,
    ) {}

    @ResolveField()
    async lockedToken(): Promise<NftCollection> {
        try {
            return await this.lockedAssetService.getLockedToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async unlockMilestones(): Promise<UnlockMileStoneModel[]> {
        try {
            return await this.lockedAssetService.getDefaultUnlockPeriod();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async nftDepositMaxLen() {
        try {
            return await this.mergeTokensService.getNftDepositMaxLen({
                smartContractType: SmartContractType.LOCKED_ASSET_FACTORY,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(type => [String])
    async nftDepositAcceptedTokenIDs() {
        try {
            return await this.mergeTokensService.getNftDepositAcceptedTokenIDs({
                smartContractType: SmartContractType.LOCKED_ASSET_FACTORY,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(returns => LockedAssetModel)
    async lockedAssetFactory(): Promise<LockedAssetModel> {
        return await this.lockedAssetService.getLockedAssetInfo();
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async unlockAssets(
        @Args() args: UnlockAssetsArs,
    ): Promise<TransactionModel> {
        return await this.transactionsService.unlockAssets(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async mergeLockedAssetTokens(
        @Args() args: TokensMergingArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.mergeTokens(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [LockedAssetAttributes])
    async decodeLockedAssetAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<LockedAssetAttributes[]> {
        return this.lockedAssetService.decodeLockedAssetAttributes(args);
    }
}
