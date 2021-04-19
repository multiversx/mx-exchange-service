import { PairService } from './pair.service';
import { Resolver, Query, ResolveField, Parent, Args, Int } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PairModel } from '../models/pair.model';
import { ContextService } from '../utils/context.service';

@Resolver(of => PairModel)
export class PairResolver {
    constructor(
        @Inject(PairService) private pairService: PairService,
        @Inject(ContextService) private context: ContextService,
    ) { }

    @ResolveField()
    async info(@Parent() pair: PairModel) {
        const { address } = pair;
        return this.pairService.getPairInfo(address);
    }

    @ResolveField()
    async price(@Parent() parent: PairModel) {
        return this.pairService.getPairPrice(parent.address);
    }
    }
}