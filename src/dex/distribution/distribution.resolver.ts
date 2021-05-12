import { Resolver, Query, ResolveField, Args, Int } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../models/transaction.model';
import { DistributionService } from './distribution.service';
import {
    CommunityDistributionModel,
    DistributionModel,
} from '../models/distribution.model';
import { TokenModel } from '../models/pair.model';
import { ProxyService } from '../utils/proxy.service';
import {
    AddLiquidityProxyArgs,
    ReclaimTemporaryFundsProxyArgs,
    RemoveLiquidityProxyArgs,
    TokensTransferArgs,
} from '../utils/dto/proxy-pair.args';
import {
    ClaimFarmRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from '../utils/dto/proxy-farm.args';

@Resolver(of => DistributionModel)
export class DistributionResolver {
    constructor(
        @Inject(DistributionService)
        private distributionService: DistributionService,
        @Inject(ProxyService)
        private proxyService: ProxyService,
    ) {}

    @ResolveField()
    async distributedToken(): Promise<TokenModel> {
        return this.distributionService.getDistributedToken();
    }

    @ResolveField()
    async lockedToken(): Promise<TokenModel> {
        return this.distributionService.getLockedToken();
    }

    @ResolveField()
    async wrappedLpToken(): Promise<TokenModel> {
        return this.distributionService.getwrappedLpToken();
    }

    @ResolveField()
    async wrappedFarmToken(): Promise<TokenModel> {
        return this.distributionService.getwrappedFarmToken();
    }

    @ResolveField()
    async acceptedLockedTokens(): Promise<TokenModel[]> {
        return this.distributionService.getAcceptedLockedAssetsTokens();
    }

    @ResolveField()
    async intermediatedPairs(): Promise<string[]> {
        return this.distributionService.getIntermediatedPairs();
    }

    @ResolveField()
    async communityDistribution(): Promise<CommunityDistributionModel> {
        return this.distributionService.getCommunityDistribution();
    }

    @Query(returns => DistributionModel)
    async distribution(): Promise<DistributionModel> {
        return this.distributionService.getDistributionInfo();
    }

    @Query(returns => TransactionModel)
    async claimAssets(): Promise<TransactionModel> {
        return this.distributionService.claimAssets();
    }

    @Query(returns => TransactionModel)
    async claimLockedAssets(): Promise<TransactionModel> {
        return this.distributionService.claimLockedAssets();
    }

    @Query(returns => TransactionModel)
    async tokensTransferProxy(
        @Args() args: TokensTransferArgs,
    ): Promise<TransactionModel> {
        return this.proxyService.esdtTransferProxy(args);
    }

    @Query(returns => TransactionModel)
    async addLiquidityProxy(
        @Args() args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        return this.proxyService.addLiquidityProxy(args);
    }

    @Query(returns => TransactionModel)
    async reclaimTemporaryFundsProxy(
        @Args() args: ReclaimTemporaryFundsProxyArgs,
    ): Promise<TransactionModel> {
        return this.proxyService.reclaimTemporaryFundsProxy(args);
    }

    @Query(returns => TransactionModel)
    async removeLiquidityProxy(
        @Args() args: RemoveLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        return this.proxyService.removeLiquidityProxy(args);
    }

    @Query(returns => TransactionModel)
    async enterFarmProxy(
        @Args() args: EnterFarmProxyArgs,
    ): Promise<TransactionModel> {
        return this.proxyService.enterFarmProxy(args);
    }

    @Query(returns => TransactionModel)
    async exitFarmProxy(
        @Args() args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        return this.proxyService.exitFarmProxy(args);
    }

    @Query(returns => TransactionModel)
    async claimFarmRewardsProxy(
        @Args() args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        return this.proxyService.claimFarmRewardsProxy(args);
    }
}
