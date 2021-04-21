import { PairService } from './pair.service';
import { Resolver, Query, ResolveField, Parent, Args, Int } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PairModel } from '../models/pair.model';
import { TransactionModel } from '../models/transaction.model';
import { ContextService } from '../utils/context.service';
import BigNumber from '@elrondnetwork/erdjs/node_modules/bignumber.js';

@Resolver(of => PairModel)
export class PairResolver {
    constructor(
        @Inject(PairService) private pairService: PairService,
        @Inject(ContextService) private context: ContextService,
    ) { }

    @ResolveField()
    async firstToken(@Parent() parent: PairModel) {
        let pairs = await this.context.getPairsMetadata();
        let pair = pairs.find(pair => pair.address === parent.address);
        return this.pairService.getToken(pair.firstToken);
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairModel) {
        let pairs = await this.context.getPairsMetadata();
        let pair = pairs.find(pair => pair.address === parent.address);
        return this.pairService.getToken(pair.secondToken);
    }

    @ResolveField()
    async liquidityPoolToken(@Parent() parent: PairModel) {
        return this.pairService.getLpToken(parent.address);
    }

    @ResolveField()
    async info(@Parent() pair: PairModel) {
        const { address } = pair;
        return this.pairService.getPairInfo(address);
    }

    @ResolveField()
    async price(@Parent() parent: PairModel) {
        return this.pairService.getPairPrice(parent.address);
    }

    @ResolveField()
    async state(@Parent() parent: PairModel) {
        return this.pairService.getPairState(parent.address);
    }

    @Query(returns => String)
    async getAmountOut(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amount') amount: string
    ) {
        return this.pairService.getAmountOut(pairAddress, tokenInID, amount);
    }

        @Args('amount') amount: string
    ) {
        return this.pairService.getAmountOut(pairAddress, tokenInId, amount);
    }
    @Query(returns => TransactionModel)
    async addLiquidity(
        @Args('pairAddress') pairAddress: string,
        @Args('amount0') amount0: string,
        @Args('amount1') amount1: string,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return await this.pairService.addLiquidity(
            pairAddress,
            new BigNumber(amount0),
            new BigNumber(amount1),
            tolerance
        );
    }
}