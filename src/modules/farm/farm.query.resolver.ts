import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from 'src/modules/auth/gql.auth.guard';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { FarmFactoryService } from './farm.factory';
import {
    BatchFarmRewardsComputeArgs,
    CalculateRewardsArgs,
} from './models/farm.args';
import { ExitFarmTokensModel, RewardsModel } from './models/farm.model';
import { FarmsUnion } from './models/farm.union';
import { FarmTokenAttributesUnion } from './models/farmTokenAttributes.model';

@Resolver()
export class FarmQueryResolver extends GenericResolver {
    constructor(private readonly farmFactory: FarmFactoryService) {
        super();
    }

    @Query(() => [FarmsUnion])
    async farms(): Promise<Array<typeof FarmsUnion>> {
        return this.farmFactory.getFarms();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => FarmTokenAttributesUnion)
    async farmTokenAttributes(
        @Args('farmAddress') farmAddress: string,
        @Args('identifier') identifier: string,
        @Args('attributes') attributes: string,
    ): Promise<typeof FarmTokenAttributesUnion> {
        return this.farmFactory
            .useService(farmAddress)
            .decodeFarmTokenAttributes(identifier, attributes);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [RewardsModel])
    async getRewardsForPosition(
        @Args('farmsPositions') args: BatchFarmRewardsComputeArgs,
    ): Promise<RewardsModel[]> {
        if (args.farmsPositions.length === 0) {
            return [];
        }
        return await this.genericQuery(() =>
            this.farmFactory
                .useService(args.farmsPositions[0].farmAddress)
                .getBatchRewardsForPosition(args.farmsPositions),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => ExitFarmTokensModel)
    async getExitFarmTokens(
        @Args('args') args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        return await this.genericQuery(() =>
            this.farmFactory
                .useService(args.farmAddress)
                .getTokensForExitFarm(args),
        );
    }
}
