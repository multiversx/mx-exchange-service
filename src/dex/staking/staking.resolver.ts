import { StakingService } from './staking.service';
import { Resolver, Query, ResolveField, Parent, Args, Int } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../dex.model';
import { GetPairsArgs, PairModel } from '../models/pair.model';
import { DexFactoryModel } from '../models/factory.model'
import { ContextService } from '../utils/context.service';


@Resolver(of => DexFactoryModel)
export class StakingResolver {
    constructor(
        @Inject(StakingService) private stakingService: StakingService,
    ) { }
}