import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
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
        try {
            return await this.pairGetterService.getFirstToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairDayDataModel) {
        try {
            return await this.pairGetterService.getSecondToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [PairDayDataModel])
    async pairsDayDatas(
        @Args('pairAddress', { nullable: true }) pairAddress: string,
    ): Promise<PairDayDataModel[]> {
        if (pairAddress) {
            return await this.analyticsPairService.getPairDayDatas(pairAddress);
        }
        return await this.analyticsPairService.getPairsDayDatas();
    }
}
