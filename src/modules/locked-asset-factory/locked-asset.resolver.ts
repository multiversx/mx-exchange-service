import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { LockedAssetService } from './locked-asset.service';
import {
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
        return await this.lockedAssetService.getLockedToken();
    }

    @ResolveField()
    async unlockMilestones(): Promise<UnlockMileStoneModel[]> {
        return await this.lockedAssetService.getDefaultUnlockPeriod();
    }

    @ResolveField()
    async nftDepositMaxLen() {
        return await this.mergeTokensService.getNftDepositMaxLen({
            smartContractType: SmartContractType.LOCKED_ASSET_FACTORY,
        });
    }

    @ResolveField(type => [String])
    async nftDepositAcceptedTokenIDs() {
        return await this.mergeTokensService.getNftDepositAcceptedTokenIDs({
            smartContractType: SmartContractType.LOCKED_ASSET_FACTORY,
        });
    }

    @Query(returns => LockedAssetModel)
    async lockedAssetFactory(): Promise<LockedAssetModel> {
        return await this.lockedAssetService.getLockedAssetInfo();
    }

    @Query(returns => TransactionModel)
    async unlockAssets(
        @Args() args: UnlockAssetsArs,
    ): Promise<TransactionModel> {
        return await this.transactionsService.unlockAssets(args);
    }

    @Query(returns => TransactionModel)
    async mergeLockedAssetTokens(
        @Args() args: TokensMergingArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.mergeTokens(args);
    }
}
