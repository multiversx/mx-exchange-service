import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PairCandlesModel } from './models/analytics.model';
import { AnalyticsPairService } from './services/analytics.pair.service';
import { PairService } from '../pair/services/pair.service';
import { PairsCandlesQueryArgs } from './models/query.args';

@Resolver(() => PairCandlesModel)
export class PairCandlesResolver {
    constructor(
        private readonly pairService: PairService,
        private readonly analyticsPairService: AnalyticsPairService,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairCandlesModel) {
        return this.pairService.getFirstToken(parent.address);
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairCandlesModel) {
        return this.pairService.getSecondToken(parent.address);
    }

    @Query(() => PairCandlesModel)
    async pairsCandles(
        @Args() args: PairsCandlesQueryArgs,
    ): Promise<PairCandlesModel> {
        return this.analyticsPairService.getPairCandles(
            args.pairAddress, 
            args.startDate, 
            args.endDate, 
            args.resolution
        );
    }
}
