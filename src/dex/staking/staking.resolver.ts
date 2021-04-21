import { StakingService } from './staking.service';
import { Resolver, Query, ResolveField, Parent, Args, Int } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../models/transaction.model';
import { StakingModel } from '../models/staking.model';


@Resolver(of => StakingModel)
export class StakingResolver {
    constructor(
        @Inject(StakingService) private stakingService: StakingService,
    ) { }

    @Query(returns => TransactionModel)
    async stake(
        @Args('tokenID') tokenID: string,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.stakingService.stake(tokenID, amount);
    }
}