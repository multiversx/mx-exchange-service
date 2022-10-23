import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from 'src/modules/auth/gql.auth.guard';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmService } from './base-module/services/farm.service';
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
import { FarmTokenAttributesUnion } from './models/farmTokenAttributes.model';
import { FarmServiceV1_2 } from './v1.2/services/farm.v1.2.service';
import { FarmServiceV1_3 } from './v1.3/services/farm.v1.3.service';
import { FarmServiceV2 } from './v2/services/farm.v2.service';

@Resolver()
export class FarmQueryResolver extends GenericResolver {
    constructor(
        private readonly farmService: FarmService,
        private readonly farmServiceV1_2: FarmServiceV1_2,
        private readonly farmServiceV1_3: FarmServiceV1_3,
        private readonly farmServiceV2: FarmServiceV2,
    ) {
        super();
    }

    @Query(() => [FarmsUnion])
    async farms(): Promise<Array<typeof FarmsUnion>> {
        return this.farmService.getFarms();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => FarmTokenAttributesUnion)
    async farmTokenAttributes(
        @Args('farmAddress') farmAddress: string,
        @Args('identifier') identifier: string,
        @Args('attributes') attributes: string,
    ): Promise<typeof FarmTokenAttributesUnion> {
        return this.getService(farmAddress).decodeFarmTokenAttributes(
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

    private getService(farmAddress: string): FarmService | FarmServiceV2 {
        const version = farmVersion(farmAddress);
        switch (version) {
            case FarmVersion.V1_2:
                return this.farmServiceV1_2;
            case FarmVersion.V1_3:
                return this.farmServiceV1_3;
            case FarmVersion.V2:
                return this.farmServiceV2;
        }
    }
}
