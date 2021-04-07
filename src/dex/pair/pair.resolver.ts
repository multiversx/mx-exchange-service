import { PairService } from './pair.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PairModel, PairPriceModel } from '../dex.model';


@Resolver(of => PairModel)
export class PairResolver {
    constructor(
        @Inject(PairService) private pairService: PairService,
    ) { }

    @ResolveField()
    async info(@Parent() pair: PairModel) {
        const { address, token_a, token_b } = pair;
        return this.pairService.getPairInfo(address);
    }

    @ResolveField()
    async price(@Parent() pair: PairModel) {
        const { address, token_a, token_b } = pair;
        let price = new PairPriceModel();
        price.tokena_price = await this.pairService.getAmountOut(address, token_a);
        price.tokenb_price = await this.pairService.getAmountOut(address, token_b);
        return price;
    }
}