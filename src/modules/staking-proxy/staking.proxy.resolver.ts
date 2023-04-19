import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
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

@Resolver(() => StakingProxyModel)
export class StakingProxyResolver {
    constructor(
        private readonly stakingProxyService: StakingProxyService,
        private readonly stakingProxyAbi: StakingProxyAbiService,
        private readonly stakingProxyTransaction: StakingProxyTransactionService,
    ) {}

    @ResolveField()
    async lpFarmAddress(@Parent() parent: StakingProxyModel): Promise<string> {
        try {
            return await this.stakingProxyAbi.lpFarmAddress(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async stakingFarmAddress(
        @Parent() parent: StakingProxyModel,
    ): Promise<string> {
        try {
            return await this.stakingProxyAbi.stakingFarmAddress(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async pairAddress(@Parent() parent: StakingProxyModel): Promise<string> {
        try {
            return await this.stakingProxyAbi.pairAddress(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async stakingToken(
        @Parent() parent: StakingProxyModel,
    ): Promise<EsdtToken> {
        try {
            return await this.stakingProxyService.getStakingToken(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmToken(
        @Parent() parent: StakingProxyModel,
    ): Promise<NftCollection> {
        try {
            return await this.stakingProxyService.getFarmToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async dualYieldToken(
        @Parent() parent: StakingProxyModel,
    ): Promise<NftCollection> {
        try {
            return await this.stakingProxyService.getDualYieldToken(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lpFarmToken(
        @Parent() parent: StakingProxyModel,
    ): Promise<NftCollection> {
        try {
            return await this.stakingProxyService.getLpFarmToken(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [DualYieldTokenAttributesModel])
    dualYieldTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): DualYieldTokenAttributesModel[] {
        try {
            return this.stakingProxyService.decodeDualYieldTokenAttributes(
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [StakingProxyModel])
    async stakingProxies(): Promise<StakingProxyModel[]> {
        try {
            return await this.stakingProxyService.getStakingProxies();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async stakeFarmTokens(
        @Args() args: ProxyStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingProxyTransaction.stakeFarmTokens(
                user.address,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimDualYield(
        @Args() args: ClaimDualYieldArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingProxyTransaction.claimDualYield(
                user.address,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async unstakeFarmTokens(
        @Args() args: UnstakeFarmTokensArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingProxyTransaction.unstakeFarmTokens(
                user.address,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [DualYieldRewardsModel])
    async getDualYieldRewardsForPosition(
        @Args('proxyStakingPositions') args: BatchFarmRewardsComputeArgs,
    ): Promise<DualYieldRewardsModel[]> {
        try {
            return await this.stakingProxyService.getBatchRewardsForPosition(
                args.farmsPositions,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => UnstakeFarmTokensReceiveModel)
    async getUnstakeTokensReceived(
        @Args('position') position: CalculateRewardsArgs,
    ): Promise<UnstakeFarmTokensReceiveModel> {
        try {
            return await this.stakingProxyService.getUnstakeTokensReceived(
                position,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
