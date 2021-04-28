import { FarmService } from './farm.service';
import {
    Resolver,
    Query,
    ResolveField,
    Parent,
    Args,
    Int,
} from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../models/transaction.model';
import { FarmModel } from '../models/farm.model';

@Resolver(of => FarmModel)
export class FarmResolver {
    constructor(@Inject(FarmService) private farmService: FarmService) {}

    @Query(returns => TransactionModel)
    async enterFarm(
        @Args('tokenID') tokenID: string,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.farmService.enterFarm(tokenID, amount);
    }
}
