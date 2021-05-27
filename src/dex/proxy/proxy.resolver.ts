import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../models/transaction.model';
import { TokenModel } from '../models/pair.model';
import {
    AddLiquidityProxyArgs,
    ReclaimTemporaryFundsProxyArgs,
    RemoveLiquidityProxyArgs,
    TokensTransferArgs,
} from './dto/proxy-pair.args';
import {
    ClaimFarmRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from './dto/proxy-farm.args';
import { ProxyPairService } from './proxy-pair/proxy-pair.service';
import {
    ProxyModel,
    WrappedFarmTokenAttributesModel,
    WrappedLpTokenAttributesModel,
} from '../models/proxy.model';
import { ProxyFarmService } from './proxy-farm/proxy-farm.service';
import { TransactionsProxyPairService } from './proxy-pair/proxy-pair-transactions.service';
import { TransactionsProxyFarmService } from './proxy-farm/proxy-farm-transactions.service';
import { ProxyService } from './proxy.service';

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
    ) {}

    @ResolveField()
    async wrappedLpToken(): Promise<TokenModel> {
        return await this.proxyPairService.getwrappedLpToken();
    }

    @ResolveField()
    async wrappedFarmToken(): Promise<TokenModel> {
        return await this.proxyFarmService.getwrappedFarmToken();
    }

    @ResolveField()
    async acceptedLockedTokens(): Promise<TokenModel[]> {
        return await this.proxyService.getAcceptedLockedAssetsTokens();
    }

    @ResolveField()
    async intermediatedPairs(): Promise<string[]> {
        return await this.proxyPairService.getIntermediatedPairs();
    }

    @ResolveField()
    async intermediatedFarms(): Promise<string[]> {
        return await this.proxyFarmService.getIntermediatedFarms();
    }

    @Query(returns => ProxyModel)
    async proxy(): Promise<ProxyModel> {
        return await this.proxyService.getProxyInfo();
    }

    @Query(returns => TransactionModel)
    async tokensTransferProxy(
        @Args() args: TokensTransferArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyPairService.esdtTransferProxy(args);
    }

    @Query(returns => TransactionModel)
    async addLiquidityProxy(
        @Args() args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyPairService.addLiquidityProxy(args);
    }

    @Query(returns => TransactionModel)
    async reclaimTemporaryFundsProxy(
        @Args() args: ReclaimTemporaryFundsProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyPairService.reclaimTemporaryFundsProxy(
            args,
        );
    }

    @Query(returns => TransactionModel)
    async removeLiquidityProxy(
        @Args() args: RemoveLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyPairService.removeLiquidityProxy(
            args,
        );
    }

    @Query(returns => TransactionModel)
    async enterFarmProxy(
        @Args() args: EnterFarmProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.enterFarmProxy(args);
    }

    @Query(returns => TransactionModel)
    async exitFarmProxy(
        @Args() args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.exitFarmProxy(args);
    }

    @Query(returns => TransactionModel)
    async claimFarmRewardsProxy(
        @Args() args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.claimFarmRewardsProxy(
            args,
        );
    }

    @Query(returns => WrappedLpTokenAttributesModel)
    async wrappedLpTokenAttributes(
        @Args('attributes') attributes: string,
    ): Promise<WrappedLpTokenAttributesModel> {
        return await this.proxyService.getWrappedLpTokenAttributes(attributes);
    }

    @Query(returns => WrappedFarmTokenAttributesModel)
    async wrappedFarmTokenAttributes(
        @Args('attributes') attributes: string,
    ): Promise<WrappedFarmTokenAttributesModel> {
        return await this.proxyService.getWrappedFarmTokenAttributes(
            attributes,
        );
    }
}
