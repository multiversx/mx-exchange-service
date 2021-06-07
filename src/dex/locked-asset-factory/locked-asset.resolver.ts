import { Resolver, Query, ResolveField, Args, Int } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../models/transaction.model';
import { LockedAssetService } from './locked-asset.service';
import { LockedAssetModel } from '../models/locked-asset.model';
import { UnlockAssetsArs } from './dto/locked-asset.args';
import { TransactionsLockedAssetService } from './transaction-locked-asset.service';
import { NFTTokenModel } from '../models/nftToken.model';

@Resolver(of => LockedAssetModel)
export class LockedAssetResolver {
    constructor(
        @Inject(LockedAssetService)
        private lockedAssetService: LockedAssetService,
        @Inject(TransactionsLockedAssetService)
        private transactionsService: TransactionsLockedAssetService,
    ) {}

    @ResolveField()
    async lockedToken(): Promise<NFTTokenModel> {
        return await this.lockedAssetService.getLockedToken();
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
}
