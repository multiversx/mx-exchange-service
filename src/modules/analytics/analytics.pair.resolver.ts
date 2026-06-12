import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PairDayDataModel } from './models/analytics.model';
import { AnalyticsPairService } from './services/analytics.pair.service';
import { StateDataLoader } from '../state/services/state.dataloader';

@Resolver(() => PairDayDataModel)
export class PairDayDataResolver {
    constructor(
        private readonly analyticsPairService: AnalyticsPairService,
        private readonly stateDataLoader: StateDataLoader,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairDayDataModel) {
        return this.stateDataLoader.loadToken(parent.firstTokenId);
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairDayDataModel) {
        return this.stateDataLoader.loadToken(parent.secondTokenId);
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
