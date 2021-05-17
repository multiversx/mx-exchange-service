import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../models/transaction.model';
import { DistributionService } from './distribution.service';
import {
    CommunityDistributionModel,
    DistributionModel,
} from '../models/distribution.model';
import { TokenModel } from '../models/pair.model';
import { ProxyFarmService } from '../utils/proxy/proxy-farm.service';
import {
    AddLiquidityProxyArgs,
    ReclaimTemporaryFundsProxyArgs,
    RemoveLiquidityProxyArgs,
    TokensTransferArgs,
} from '../utils/proxy/dto/proxy-pair.args';
import {
    ClaimFarmRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from '../utils/proxy/dto/proxy-farm.args';
import { ProxyPairService } from '../utils/proxy/proxy-pair.service';

@Resolver(of => DistributionModel)
export class DistributionResolver {
    constructor(
        @Inject(DistributionService)
        private distributionService: DistributionService,
        @Inject(ProxyPairService) private proxyPairService: ProxyPairService,
        @Inject(ProxyFarmService)
        private proxyFarmService: ProxyFarmService,
    ) {}

    @ResolveField()
    async distributedToken(): Promise<TokenModel> {
        return await this.distributionService.getDistributedToken();
    }

    @ResolveField()
    async lockedToken(): Promise<TokenModel> {
        return await this.distributionService.getLockedToken();
    }

    @ResolveField()
    async wrappedLpToken(): Promise<TokenModel> {
        return await this.distributionService.getwrappedLpToken();
    }

    @ResolveField()
    async wrappedFarmToken(): Promise<TokenModel> {
        return await this.distributionService.getwrappedFarmToken();
    }

    @ResolveField()
    async acceptedLockedTokens(): Promise<TokenModel[]> {
        return await this.distributionService.getAcceptedLockedAssetsTokens();
    }

    @ResolveField()
    async intermediatedPairs(): Promise<string[]> {
        return await this.distributionService.getIntermediatedPairs();
    }

    @ResolveField()
    async communityDistribution(): Promise<CommunityDistributionModel> {
        return await this.distributionService.getCommunityDistribution();
    }

    @Query(returns => DistributionModel)
    async distribution(): Promise<DistributionModel> {
        return await this.distributionService.getDistributionInfo();
    }

    @Query(returns => TransactionModel)
    async claimAssets(): Promise<TransactionModel> {
        return await this.distributionService.claimAssets();
    }

    @Query(returns => TransactionModel)
    async claimLockedAssets(): Promise<TransactionModel> {
        return await this.distributionService.claimLockedAssets();
    }

    @Query(returns => TransactionModel)
    async tokensTransferProxy(
        @Args() args: TokensTransferArgs,
    ): Promise<TransactionModel> {
        return await this.proxyPairService.esdtTransferProxy(args);
    }

    @Query(returns => TransactionModel)
    async addLiquidityProxy(
        @Args() args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        return await this.proxyPairService.addLiquidityProxy(args);
    }

    @Query(returns => TransactionModel)
    async reclaimTemporaryFundsProxy(
        @Args() args: ReclaimTemporaryFundsProxyArgs,
    ): Promise<TransactionModel> {
        return await this.proxyPairService.reclaimTemporaryFundsProxy(args);
    }

    @Query(returns => TransactionModel)
    async removeLiquidityProxy(
        @Args() args: RemoveLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        return await this.proxyPairService.removeLiquidityProxy(args);
    }

    @Query(returns => TransactionModel)
    async enterFarmProxy(
        @Args() args: EnterFarmProxyArgs,
    ): Promise<TransactionModel> {
        return await this.proxyFarmService.enterFarmProxy(args);
    }

    @Query(returns => TransactionModel)
    async exitFarmProxy(
        @Args() args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        return await this.proxyFarmService.exitFarmProxy(args);
    }

    @Query(returns => TransactionModel)
    async claimFarmRewardsProxy(
        @Args() args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        return await this.proxyFarmService.claimFarmRewardsProxy(args);
    }
}
