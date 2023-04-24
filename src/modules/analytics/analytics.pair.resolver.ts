import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { PairDayDataModel } from './models/analytics.model';
import { AnalyticsPairService } from './services/analytics.pair.service';
import { PairService } from '../pair/services/pair.service';

@Resolver(() => PairDayDataModel)
export class PairDayDataResolver {
    constructor(
        private readonly pairService: PairService,
        private readonly analyticsPairService: AnalyticsPairService,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairDayDataModel) {
        try {
            return await this.pairService.getFirstToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairDayDataModel) {
        try {
            return await this.pairService.getSecondToken(parent.address);
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
