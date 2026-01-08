import { UseGuards, UsePipes } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { relayQueryEstimator } from 'src/helpers/complexity/query.estimators';
import { QueryArgsValidationPipe } from 'src/helpers/validators/query.args.validation.pipe';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import ConnectionArgs, {
    getPagingParameters,
} from '../common/filters/connection.args';
import PageResponse from '../common/page.response';
import { FarmFactoryService } from './farm.factory';
import {
    BatchFarmRewardsComputeArgs,
    CalculateRewardsArgs,
    FarmsFilter,
} from './models/farm.args';
import { ExitFarmTokensModel, RewardsModel } from './models/farm.model';
import { FarmsUnion } from './models/farm.union';
import { FarmModel } from './models/farm.v2.model';
import { FarmsResponse } from './models/farms.response';
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

    @Query(() => FarmsResponse, {
        complexity: relayQueryEstimator,
    })
    @UsePipes(new QueryArgsValidationPipe())
    async filteredFarms(
        @Args({ name: 'filters', type: () => FarmsFilter, nullable: true })
        filters: FarmsFilter,
        @Args({
            name: 'pagination',
            type: () => ConnectionArgs,
            nullable: true,
        })
        pagination: ConnectionArgs,
    ): Promise<FarmsResponse> {
        const { limit, offset } = getPagingParameters(pagination);

        const response = await this.farmFactory.getFilteredFarms(
            offset,
            limit,
            filters,
        );

        return PageResponse.mapResponse<FarmModel>(
            response?.items || [],
            pagination ?? new ConnectionArgs(),
            response?.count || 0,
            offset,
            limit,
        );
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
