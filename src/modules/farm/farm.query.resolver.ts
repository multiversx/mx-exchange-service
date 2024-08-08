import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { FarmFactoryService } from './farm.factory';
import {
    BatchFarmRewardsComputeArgs,
    CalculateRewardsArgs,
    FarmsFilter,
} from './models/farm.args';
import { ExitFarmTokensModel, RewardsModel } from './models/farm.model';
import { FarmsUnion } from './models/farm.union';
import { FarmTokenAttributesUnion } from './models/farmTokenAttributes.model';

@Resolver()
export class FarmQueryResolver {
    constructor(private readonly farmFactory: FarmFactoryService) {}

    @Query(() => [FarmsUnion])
    async farms(
        @Args({
            name: 'filters',
            type: () => FarmsFilter,
            nullable: true,
        })
        filters: FarmsFilter,
    ): Promise<Array<typeof FarmsUnion>> {
        return this.farmFactory.getFarms(filters);
    }

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [RewardsModel])
    async getRewardsForPosition(
        @Args('farmsPositions') args: BatchFarmRewardsComputeArgs,
    ): Promise<RewardsModel[]> {
        if (args.farmsPositions.length === 0) {
            return [];
        }
        return this.farmFactory
            .useService(args.farmsPositions[0].farmAddress)
            .getBatchRewardsForPosition(args.farmsPositions);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => ExitFarmTokensModel)
    async getExitFarmTokens(
        @Args('args') args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        return this.farmFactory
            .useService(args.farmAddress)
            .getTokensForExitFarm(args);
    }
}
