import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { User } from 'src/helpers/userDecorator';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAdminGuard } from 'src/modules/auth/gql.admin.guard';
import { GqlAuthGuard } from 'src/modules/auth/gql.auth.guard';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import {
    BatchFarmRewardsComputeArgs,
    CalculateRewardsArgs,
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    FarmMigrationConfigArgs,
    MergeFarmTokensArgs,
} from '../models/farm.args';
import { ExitFarmTokensModel, RewardsModel } from '../models/farm.model';
import { FarmsUnion } from '../models/farm.union';
import { FarmTokenAttributesModel } from '../models/farmTokenAttributes.model';
import { FarmService } from '../services/farm.service';
import { TransactionsFarmService } from '../services/farm.transaction.service';

@Resolver()
export class FarmQueryResolver extends GenericResolver {
    constructor(
        private readonly farmService: FarmService,
        private readonly transactionsService: TransactionsFarmService,
    ) {
        super();
    }

    @Query(() => [FarmsUnion])
    async farms(): Promise<Array<typeof FarmsUnion>> {
        return this.farmService.getFarms();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => FarmTokenAttributesModel)
    async farmTokenAttributes(
        @Args('farmAddress') farmAddress: string,
        @Args('identifier') identifier: string,
        @Args('attributes') attributes: string,
    ): Promise<FarmTokenAttributesModel> {
        return this.farmService.decodeFarmTokenAttributes(
            farmAddress,
            identifier,
            attributes,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [RewardsModel])
    async getRewardsForPosition(
        @Args('farmsPositions') args: BatchFarmRewardsComputeArgs,
    ): Promise<RewardsModel[]> {
        return await this.genericQuery(() =>
            this.farmService.getBatchRewardsForPosition(args.farmsPositions),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => ExitFarmTokensModel)
    async getExitFarmTokens(
        @Args('args') args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        return await this.genericQuery(() =>
            this.farmService.getTokensForExitFarm(args),
        );
    }
}
