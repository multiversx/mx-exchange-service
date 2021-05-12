import { Resolver, Query, ResolveField, Args, Int } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../models/transaction.model';
import { LockedRewardsService } from './locked-rewards.service';
import {
    LockedRewardsModel,
    LockOptionModel,
} from '../models/locked-rewards.model';

@Resolver(of => LockedRewardsModel)
export class LockedRewardsResolver {
    constructor(
        @Inject(LockedRewardsService)
        private lockedRewardsService: LockedRewardsService,
    ) {}

    @ResolveField()
    async lockOptions(): Promise<LockOptionModel[]> {
        return this.lockedRewardsService.getAllLockRewardOptions();
    }

    @Query(returns => LockedRewardsModel)
    async lockedRewards(): Promise<LockedRewardsModel> {
        return new LockedRewardsModel();
    }

    @Query(returns => TransactionModel)
    async lockRewardsTokens(
        @Args('tokenID') tokenID: string,
        @Args('amount') amount: string,
        @Args('epochs', { type: () => Int }) epochs: number,
    ): Promise<TransactionModel> {
        return this.lockedRewardsService.lockRewardsTokens(
            tokenID,
            amount,
            epochs,
        );
    }

    @Query(returns => TransactionModel)
    async unlockRewardsTokens(
        @Args('sender') sender: string,
        @Args('lockTokenID') lockTokenID: string,
        @Args('lockTokenNonce', { type: () => Int }) lockTokenNonce: number,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.lockedRewardsService.unlockRewardsTokens(
            sender,
            lockTokenID,
            lockTokenNonce,
            amount,
        );
    }
}
