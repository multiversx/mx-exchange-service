import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { PairDayDataModel } from './models/analytics.model';
import { AnalyticsPairService } from './services/analytics.pair.service';

@Resolver(() => PairDayDataModel)
export class PairDayDataResolver {
    constructor(
        private readonly pairGetterService: PairGetterService,
        private readonly analyticsPairService: AnalyticsPairService,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairDayDataModel) {
        return this.pairGetterService.getFirstToken(parent.address);
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairDayDataModel) {
        return this.pairGetterService.getSecondToken(parent.address);
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
}
