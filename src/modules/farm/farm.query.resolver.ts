import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from 'src/modules/auth/gql.auth.guard';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { farmVersion } from 'src/utils/farm.utils';
import {
    BatchFarmRewardsComputeArgs,
    CalculateRewardsArgs,
} from './models/farm.args';
import {
    ExitFarmTokensModel,
    FarmVersion,
    RewardsModel,
} from './models/farm.model';
import { FarmsUnion } from './models/farm.union';
import { FarmTokenAttributesModel } from './models/farmTokenAttributes.model';
import { FarmService } from '../services/farm.service';
import { FarmV2Service } from '../services/v2/farm.v2.service';

@Resolver()
export class FarmQueryResolver extends GenericResolver {
    constructor(
        private readonly farmService: FarmService,
        private readonly farmV2Service: FarmV2Service,
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
        return this.getService(farmAddress).decodeFarmTokenAttributes(
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
            this.getService(
                args.farmsPositions[0].farmAddress,
            ).getBatchRewardsForPosition(args.farmsPositions),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => ExitFarmTokensModel)
    async getExitFarmTokens(
        @Args('args') args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        return await this.genericQuery(() =>
            this.getService(args.farmAddress).getTokensForExitFarm(args),
        );
    }

    private getService(farmAddress: string): FarmService | FarmV2Service {
        const version = farmVersion(farmAddress);
        switch (version) {
            case FarmVersion.V2:
                return this.farmV2Service;
            default:
                return this.farmService;
        }
    }
}
