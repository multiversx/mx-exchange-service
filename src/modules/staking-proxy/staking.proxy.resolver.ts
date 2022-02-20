import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { User } from 'src/helpers/userDecorator';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { BatchFarmRewardsComputeArgs } from '../farm/models/farm.args';
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
} from './models/staking.proxy.model';
import { StakingProxyGetterService } from './services/staking.proxy.getter.service';
import { StakingProxyService } from './services/staking.proxy.service';
import { StakingProxyTransactionService } from './services/staking.proxy.transactions.service';

@Resolver(() => StakingProxyModel)
export class StakingProxyResolver {
    constructor(
        private readonly stakingProxyService: StakingProxyService,
        private readonly stakingProxyGetter: StakingProxyGetterService,
        private readonly stakingProxyTransaction: StakingProxyTransactionService,
    ) {}

    @ResolveField()
    async lpFarmAddress(@Parent() parent: StakingProxyModel): Promise<string> {
        try {
            return await this.stakingProxyGetter.getLpFarmAddress(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async stakingFarmAddress(
        @Parent() parent: StakingProxyModel,
    ): Promise<string> {
        try {
            return await this.stakingProxyGetter.getStakingFarmAddress(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async pairAddress(@Parent() parent: StakingProxyModel): Promise<string> {
        try {
            return await this.stakingProxyGetter.getPairAddress(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async stakingToken(
        @Parent() parent: StakingProxyModel,
    ): Promise<EsdtToken> {
        try {
            return await this.stakingProxyGetter.getStakingToken(
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
            return await this.stakingProxyGetter.getFarmToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async dualYieldToken(
        @Parent() parent: StakingProxyModel,
    ): Promise<NftCollection> {
        try {
            return await this.stakingProxyGetter.getDualYieldToken(
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
            return await this.stakingProxyGetter.getLpFarmToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
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
            return this.stakingProxyService.getStakingProxies();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async stakeFarmTokens(
        @Args() args: ProxyStakeFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingProxyTransaction.stakeFarmTokens(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimDualYield(
        @Args() args: ClaimDualYieldArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingProxyTransaction.claimDualYield(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unstakeFarmTokens(
        @Args() args: UnstakeFarmTokensArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingProxyTransaction.unstakeFarmTokens(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
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
}
