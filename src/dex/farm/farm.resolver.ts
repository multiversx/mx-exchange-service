import { FarmService } from './farm.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../models/transaction.model';
import { FarmModel } from '../models/farm.model';
import { TokenModel } from '../models/pair.model';

@Resolver(of => FarmModel)
export class FarmResolver {
    constructor(@Inject(FarmService) private farmService: FarmService) {}

    @ResolveField()
    async farmedToken(@Parent() parent: FarmModel) {
        return this.farmService.getFarmedToken(parent.address);
    }

    @ResolveField()
    async farmToken(@Parent() parent: FarmModel) {
        return this.farmService.getFarmToken(parent.address);
    }

    @ResolveField(returns => [TokenModel])
    async acceptedTokens(@Parent() parent: FarmModel) {
        return this.farmService.getAcceptedTokens(parent.address);
    }

    @ResolveField()
    async state(@Parent() parent: FarmModel) {
        return this.farmService.getState(parent.address);
    }

    @Query(returns => [FarmModel])
    async farms(): Promise<FarmModel[]> {
        return this.farmService.getFarms();
    }

    @Query(returns => String)
    async getRewardsForPosition(
        @Args('farmAddress') farmAddress: string,
        @Args('farmTokenNonce') farmTokenNonce: number,
        @Args('amount') amount: string,
    ): Promise<string> {
        return this.farmService.getRewardsForPosition(
            farmAddress,
            farmTokenNonce,
            amount,
        );
    }

    @Query(returns => TransactionModel)
    async enterFarm(
        @Args('farmAddress') farmAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.farmService.enterFarm(farmAddress, tokenInID, amount);
    }

    @Query(returns => TransactionModel)
    async exitFarm(
        @Args('farmAddress') farmAddress: string,
        @Args('sender') sender: string,
        @Args('farmTokenID') farmTokenID: string,
        @Args('farmTokenNonce') farmTokenNonce: number,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.farmService.exitFarm(
            farmAddress,
            sender,
            farmTokenID,
            farmTokenNonce,
            amount,
        );
    }
}
