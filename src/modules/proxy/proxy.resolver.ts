import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import {
    AddLiquidityProxyArgs,
    RemoveLiquidityProxyArgs,
} from './models/proxy-pair.args';
import {
    ClaimFarmRewardsProxyArgs,
    CompoundRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from './models/proxy-farm.args';
import { ProxyPairGetterService } from './services/proxy-pair/proxy-pair.getter.service';
import { ProxyModel } from './models/proxy.model';
import { WrappedLpTokenAttributesModel } from './models/wrappedLpTokenAttributes.model';
import { WrappedFarmTokenAttributesModel } from './models/wrappedFarmTokenAttributes.model';
import { ProxyFarmGetterService } from './services/proxy-farm/proxy-farm.getter.service';
import { TransactionsProxyPairService } from './services/proxy-pair/proxy-pair-transactions.service';
import { TransactionsProxyFarmService } from './services/proxy-farm/proxy-farm-transactions.service';
import { ProxyService } from './services/proxy.service';
import { DecodeAttributesArgs } from './models/proxy.args';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { ApolloError } from 'apollo-server-express';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { ProxyGetterService } from './services/proxy.getter.service';

@Resolver(() => ProxyModel)
export class ProxyResolver {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyGetter: ProxyGetterService,
        private readonly proxyPairGetter: ProxyPairGetterService,
        private readonly proxyFarmGetter: ProxyFarmGetterService,
        private readonly transactionsProxyPairService: TransactionsProxyPairService,
        private readonly transactionsProxyFarmService: TransactionsProxyFarmService,
    ) {}

    @ResolveField()
    async wrappedLpToken(): Promise<NftCollection> {
        try {
            return await this.proxyPairGetter.getwrappedLpToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async wrappedFarmToken(): Promise<NftCollection> {
        try {
            return await this.proxyFarmGetter.getwrappedFarmToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async assetToken(): Promise<EsdtToken> {
        try {
            return await this.proxyGetter.getAssetToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedAssetToken(): Promise<NftCollection> {
        try {
            return await this.proxyGetter.getlockedAssetToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async intermediatedPairs(): Promise<string[]> {
        try {
            return await this.proxyPairGetter.getIntermediatedPairs();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async intermediatedFarms(): Promise<string[]> {
        try {
            return await this.proxyFarmGetter.getIntermediatedFarms();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => ProxyModel)
    async proxy(): Promise<ProxyModel> {
        return await this.proxyService.getProxyInfo();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async addLiquidityProxyBatch(
        @Args() args: AddLiquidityProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            return await this.transactionsProxyPairService.addLiquidityProxyBatch(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async addLiquidityProxy(
        @Args() args: AddLiquidityProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionsProxyPairService.addLiquidityProxy(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async removeLiquidityProxy(
        @Args() args: RemoveLiquidityProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        return await this.transactionsProxyPairService.removeLiquidityProxy(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async enterFarmProxy(
        @Args() args: EnterFarmProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionsProxyFarmService.enterFarmProxy(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async exitFarmProxy(
        @Args() args: ExitFarmProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.exitFarmProxy(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimFarmRewardsProxy(
        @Args() args: ClaimFarmRewardsProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.claimFarmRewardsProxy(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeWrappedLpTokens(
        @Args('tokens', { type: () => [InputTokenModel] })
        tokens: InputTokenModel[],
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionsProxyPairService.mergeWrappedLPTokens(
                user.publicKey,
                tokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeWrappedFarmTokens(
        @Args('farmAddress') farmAddress: string,
        @Args('tokens', { type: () => [InputTokenModel] })
        tokens: InputTokenModel[],
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionsProxyFarmService.mergeWrappedFarmTokens(
                user.publicKey,
                farmAddress,
                tokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async compoundRewardsProxy(
        @Args() args: CompoundRewardsProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.compoundRewardsProxy(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async migrateToNewFarmProxy(
        @Args() args: ExitFarmProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.migrateToNewFarmProxy(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [WrappedLpTokenAttributesModel])
    async wrappedLpTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<WrappedLpTokenAttributesModel[]> {
        return this.proxyService.getWrappedLpTokenAttributes(args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [WrappedFarmTokenAttributesModel])
    async wrappedFarmTokenAttributes(
        @Args('args')
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        return await this.proxyService.getWrappedFarmTokenAttributes(args);
    }
}
