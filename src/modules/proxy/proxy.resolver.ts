import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import {
    AddLiquidityProxyArgs,
    RemoveLiquidityProxyArgs,
} from './models/proxy-pair.args';
import {
    ClaimFarmRewardsProxyArgs,
    CompoundRewardsProxyArgs,
    EnterFarmProxyArgs,
    EnterFarmProxyBatchArgs,
    ExitFarmProxyArgs,
} from './models/proxy-farm.args';
import { ProxyPairService } from './proxy-pair/proxy-pair.service';
import { ProxyModel } from './models/proxy.model';
import { WrappedLpTokenAttributesModel } from './models/wrappedLpTokenAttributes.model';
import { WrappedFarmTokenAttributesModel } from './models/wrappedFarmTokenAttributes.model';
import { ProxyFarmService } from './proxy-farm/proxy-farm.service';
import { TransactionsProxyPairService } from './proxy-pair/proxy-pair-transactions.service';
import { TransactionsProxyFarmService } from './proxy-farm/proxy-farm-transactions.service';
import { ProxyService } from './proxy.service';
import { DecodeAttributesArgs } from './models/proxy.args';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import {
    TokensMergingArgs,
    DepositTokenArgs,
    SmartContractType,
} from '../token-merging/dto/token.merging.args';
import { TokenMergingTransactionsService } from '../token-merging/token.merging.transactions.service';
import { TokenMergingService } from '../token-merging/token.merging.service';
import { ApolloError } from 'apollo-server-express';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';

@Resolver(of => ProxyModel)
export class ProxyResolver {
    constructor(
        @Inject(ProxyService) private proxyService: ProxyService,
        @Inject(ProxyPairService) private proxyPairService: ProxyPairService,
        @Inject(ProxyFarmService)
        private proxyFarmService: ProxyFarmService,
        @Inject(TransactionsProxyPairService)
        private transactionsProxyPairService: TransactionsProxyPairService,
        @Inject(TransactionsProxyFarmService)
        private transactionsProxyFarmService: TransactionsProxyFarmService,
        @Inject(TokenMergingTransactionsService)
        private readonly mergeTokensTransactions: TokenMergingTransactionsService,
        @Inject(TokenMergingService)
        private readonly mergeTokensService: TokenMergingService,
    ) {}

    @ResolveField()
    async wrappedLpToken(): Promise<NftCollection> {
        try {
            return await this.proxyPairService.getwrappedLpToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async wrappedFarmToken(): Promise<NftCollection> {
        try {
            return await this.proxyFarmService.getwrappedFarmToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async assetToken(): Promise<EsdtToken> {
        try {
            return await this.proxyService.getAssetToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedAssetToken(): Promise<NftCollection> {
        try {
            return await this.proxyService.getlockedAssetToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async intermediatedPairs(): Promise<string[]> {
        try {
            return await this.proxyPairService.getIntermediatedPairs();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async intermediatedFarms(): Promise<string[]> {
        try {
            return await this.proxyFarmService.getIntermediatedFarms();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async nftDepositMaxLen() {
        try {
            return await this.mergeTokensService.getNftDepositMaxLen({
                smartContractType: SmartContractType.PROXY_PAIR,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(type => [String])
    async nftDepositAcceptedTokenIDs() {
        try {
            return await this.mergeTokensService.getNftDepositAcceptedTokenIDs({
                smartContractType: SmartContractType.PROXY_PAIR,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(returns => ProxyModel)
    async proxy(): Promise<ProxyModel> {
        return await this.proxyService.getProxyInfo();
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => [TransactionModel])
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
    @Query(returns => TransactionModel)
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
    @Query(returns => [TransactionModel])
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
    @Query(returns => TransactionModel)
    async enterFarmProxy(
        @Args() args: EnterFarmProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.enterFarmProxy(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => [TransactionModel])
    async enterFarmProxyBatch(
        @Args() args: EnterFarmProxyBatchArgs,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        const depositTokenArgs: DepositTokenArgs = {
            smartContractType: SmartContractType.PROXY_FARM,
            tokenID: args.lockedFarmTokenID,
            tokenNonce: args.lockedFarmTokenNonce,
            amount: args.lockedFarmAmount,
        };
        const enterFarmProxyArgs: EnterFarmProxyArgs = {
            acceptedLockedTokenID: args.acceptedLockedTokenID,
            acceptedLockedTokenNonce: args.acceptedLockedTokenNonce,
            farmAddress: args.farmAddress,
            amount: args.amount,
            lockRewards: args.lockRewards,
        };
        return await Promise.all([
            this.mergeTokensTransactions.depositTokens(
                user.publicKey,
                depositTokenArgs,
            ),
            this.transactionsProxyFarmService.enterFarmProxy(
                user.publicKey,
                enterFarmProxyArgs,
                true,
            ),
        ]);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
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
    @Query(returns => TransactionModel)
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
    @Query(returns => TransactionModel)
    async mergeWrappedLpTokens(
        @Args() args: TokensMergingArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.mergeTokens(args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async mergeWrappedFarmTokens(
        @Args() args: TokensMergingArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.mergeTokens(args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
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
    @Query(returns => [WrappedLpTokenAttributesModel])
    async wrappedLpTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<WrappedLpTokenAttributesModel[]> {
        return this.proxyService.getWrappedLpTokenAttributes(args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => [WrappedFarmTokenAttributesModel])
    async wrappedFarmTokenAttributes(
        @Args('args')
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        return await this.proxyService.getWrappedFarmTokenAttributes(args);
    }
}
