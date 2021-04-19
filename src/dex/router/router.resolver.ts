import { RouterService } from './router.service';
import { Resolver, Query, ResolveField, Parent, Args, Int } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../dex.model';
import { GetPairsArgs, PairModel } from '../models/pair.model';
import { DexFactoryModel } from '../models/factory.model'


@Resolver(of => DexFactoryModel)
export class RouterResolver {
    constructor(
        @Inject(RouterService) private routerService: RouterService,
    ) { }

    @Query(returns => DexFactoryModel)
    async dexFactory() {
        return await this.routerService.getDexFactory();
    }

    @ResolveField(returns => Int!)
    async pairCount(@Parent() dexFactoryModel: DexFactoryModel) {
        return await this.routerService.getPairCount();
    }

    @ResolveField(returns => Int!)
    async totalTxCount(@Parent() dexFactoryModel: DexFactoryModel) {
        return await this.routerService.getTotalTxCount();
    }

    @Query((returns => [PairModel]))
    async pairs(@Args() page: GetPairsArgs): Promise<PairModel[]> {
        return await this.routerService.getAllPairs(page.offset, page.limit);
    }

    @Query(returns => TransactionModel)
    async createPair(
        @Args('token_a') token_a: string,
        @Args('token_b') token_b: string
    ): Promise<TransactionModel> {
        return await this.routerService.createPair(token_a, token_b);
    }

    @Query(returns => TransactionModel)
    async issueLPToken(
        @Args('address') address: string,
        @Args('lpTokenName') lpTokenName: string,
        @Args('lpTokenTicker') lpTokenTicker: string
    ): Promise<TransactionModel> {
        return await this.routerService.issueLpToken(address, lpTokenName, lpTokenTicker);
    }

    @Query(returns => TransactionModel)
    async setLocalRoles(
        @Args('address') address: string,
    ): Promise<TransactionModel> {
        return await this.routerService.setLocalRoles(address);
    }

}