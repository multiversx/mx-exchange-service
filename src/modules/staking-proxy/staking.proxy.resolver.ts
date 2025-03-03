import { UseGuards, UsePipes } from '@nestjs/common';
import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TransactionModel } from 'src/models/transaction.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import {
    BatchFarmRewardsComputeArgs,
    CalculateRewardsArgs,
} from '../farm/models/farm.args';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import { DualYieldTokenAttributesModel } from './models/dualYieldTokenAttributes.model';
import {
    ClaimDualYieldArgs,
    ProxyStakeFarmArgs,
    StakingProxiesFilter,
    UnstakeFarmTokensArgs,
} from './models/staking.proxy.args.model';
import {
    DualYieldRewardsModel,
    StakingProxyModel,
    UnstakeFarmTokensReceiveModel,
} from './models/staking.proxy.model';
import { StakingProxyService } from './services/staking.proxy.service';
import { StakingProxyTransactionService } from './services/staking.proxy.transactions.service';
import { StakingProxyAbiService } from './services/staking.proxy.abi.service';
import { StakingProxyAddressValidationPipe } from './validators/staking.proxy.address.validator';
import { StakingProxiesResponse } from './models/staking.proxies.response';
import ConnectionArgs, {
    getPagingParameters,
} from '../common/filters/connection.args';
import PageResponse from '../common/page.response';
import { QueryArgsValidationPipe } from 'src/helpers/validators/query.args.validation.pipe';
import { relayQueryEstimator } from 'src/helpers/complexity/query.estimators';

@Resolver(() => StakingProxyModel)
export class StakingProxyResolver {
    constructor(
        private readonly stakingProxyService: StakingProxyService,
        private readonly stakingProxyAbi: StakingProxyAbiService,
        private readonly stakingProxyTransaction: StakingProxyTransactionService,
    ) {}

    @ResolveField()
    async lpFarmAddress(parent: StakingProxyModel): Promise<string> {
        return this.stakingProxyAbi.lpFarmAddress(parent.address);
    }

    @ResolveField()
    async stakingFarmAddress(parent: StakingProxyModel): Promise<string> {
        return this.stakingProxyAbi.stakingFarmAddress(parent.address);
    }

    @ResolveField()
    async stakingMinUnboundEpochs(parent: StakingProxyModel): Promise<number> {
        return this.stakingProxyService.getStakingFarmMinUnboundEpochs(
            parent.address,
        );
    }

    @ResolveField()
    async pairAddress(parent: StakingProxyModel): Promise<string> {
        return this.stakingProxyAbi.pairAddress(parent.address);
    }

    @ResolveField()
    async stakingToken(parent: StakingProxyModel): Promise<EsdtToken> {
        return this.stakingProxyService.getStakingToken(parent.address);
    }

    @ResolveField()
    async farmToken(parent: StakingProxyModel): Promise<NftCollection> {
        return this.stakingProxyService.getFarmToken(parent.address);
    }

    @ResolveField()
    async dualYieldToken(parent: StakingProxyModel): Promise<NftCollection> {
        return this.stakingProxyService.getDualYieldToken(parent.address);
    }

    @ResolveField()
    async lpFarmToken(parent: StakingProxyModel): Promise<NftCollection> {
        return this.stakingProxyService.getLpFarmToken(parent.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [DualYieldTokenAttributesModel])
    dualYieldTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): DualYieldTokenAttributesModel[] {
        return this.stakingProxyService.decodeDualYieldTokenAttributes(args);
    }

    @Query(() => [StakingProxyModel])
    async stakingProxies(): Promise<StakingProxyModel[]> {
        return this.stakingProxyService.getStakingProxies();
    }

    @Query(() => StakingProxiesResponse, {
        complexity: relayQueryEstimator,
    })
    @UsePipes(new QueryArgsValidationPipe())
    async filteredStakingProxies(
        @Args({
            name: 'filters',
            type: () => StakingProxiesFilter,
            nullable: true,
        })
        filters: StakingProxiesFilter,
        @Args({
            name: 'pagination',
            type: () => ConnectionArgs,
            nullable: true,
        })
        pagination: ConnectionArgs,
    ): Promise<StakingProxiesResponse> {
        const pagingParams = getPagingParameters(pagination);

        const response =
            await this.stakingProxyService.getFilteredStakingProxies(
                pagingParams,
                filters,
            );

        return PageResponse.mapResponse<StakingProxyModel>(
            response?.items || [],
            pagination ?? new ConnectionArgs(),
            response?.count || 0,
            pagingParams.offset,
            pagingParams.limit,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async stakeFarmTokens(
        @Args() args: ProxyStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingProxyTransaction.stakeFarmTokens(user.address, args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimDualYield(
        @Args() args: ClaimDualYieldArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingProxyTransaction.claimDualYield(user.address, args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async unstakeFarmTokens(
        @Args() args: UnstakeFarmTokensArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingProxyTransaction.unstakeFarmTokens(
            user.address,
            args,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [DualYieldRewardsModel])
    async getDualYieldRewardsForPosition(
        @Args('proxyStakingPositions') args: BatchFarmRewardsComputeArgs,
    ): Promise<DualYieldRewardsModel[]> {
        return this.stakingProxyService.getBatchRewardsForPosition(
            args.farmsPositions,
        );
    }

    @Query(() => UnstakeFarmTokensReceiveModel)
    async getUnstakeTokensReceived(
        @Args('position') position: CalculateRewardsArgs,
    ): Promise<UnstakeFarmTokensReceiveModel> {
        return this.stakingProxyService.getUnstakeTokensReceived(position);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel], {
        description:
            'Update staking / farm positions for total farm position from dual yield token',
    })
    async migrateTotalDualFarmTokenPosition(
        @Args(
            'dualFarmsAddresses',
            { type: () => [String] },
            StakingProxyAddressValidationPipe,
        )
        dualFarmsAddresses: string[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        const promises = dualFarmsAddresses.map((address) =>
            this.stakingProxyTransaction.migrateTotalDualFarmTokenPosition(
                address,
                user.address,
            ),
        );

        return (await Promise.all(promises)).flat();
    }
}
