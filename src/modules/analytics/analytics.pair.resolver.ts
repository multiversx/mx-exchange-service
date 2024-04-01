import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PairCandlesModel, PairDayDataModel } from './models/analytics.model';
import { AnalyticsPairService } from './services/analytics.pair.service';
import { PairService } from '../pair/services/pair.service';
import { PairsCandlesQueryArgs } from './models/query.args';

@Resolver(() => PairDayDataModel)
export class PairDayDataResolver {
    constructor(
        private readonly pairService: PairService,
        private readonly analyticsPairService: AnalyticsPairService,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairDayDataModel) {
        return this.pairService.getFirstToken(parent.address);
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairDayDataModel) {
        return this.pairService.getSecondToken(parent.address);
    }

    @Query(() => [PairDayDataModel])
    async pairsDayDatas(
        @Args('pairAddress', { nullable: true }) pairAddress: string,
    ): Promise<PairDayDataModel[]> {
        if (pairAddress) {
            return this.analyticsPairService.getPairDayDatas(pairAddress);
        }
        return this.analyticsPairService.getPairsDayDatas();
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
