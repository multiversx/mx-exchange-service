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
        @Args('amount') amount: string,
        @Args('tokenID') tokenID: string,
        @Args('tokenNonce', { nullable: true, type: () => Int })
        tokenNonce?: number,
        @Args('sender', { nullable: true }) sender?: string,
    ): Promise<TransactionModel> {
        return this.proxyService.esdtTransferProxy(
            amount,
            tokenID,
            tokenNonce,
            sender,
        );
    }

    @Query(returns => TransactionModel)
    async addLiquidityProxy(
        @Args('pairAddress') pairAddress: string,
        @Args('amount0') amount0: string,
        @Args('amount1') amount1: string,
        @Args('tolerance') tolerance: number,
        @Args('token0ID') token0ID: string,
        @Args('token1ID') token1ID: string,
        @Args('token0Nonce', { nullable: true, type: () => Int })
        token0Nonce?: number,
        @Args('token1Nonce', { nullable: true, type: () => Int })
        token1Nonce?: number,
    ): Promise<TransactionModel> {
        return this.proxyService.addLiquidityProxy(
            pairAddress,
            amount0,
            amount1,
            tolerance,
            token0ID,
            token1ID,
            token0Nonce,
            token1Nonce,
        );
    }

    @Query(returns => TransactionModel)
    async reclaimTemporaryFundsProxy(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @Args('firstTokenNonce', { nullable: true, type: () => Int })
        firstTokenNonce?: number,
        @Args('secondTokenNonce', { nullable: true, type: () => Int })
        secondTokenNonce?: number,
    ): Promise<TransactionModel> {
        return this.proxyService.reclaimTemporaryFundsProxy(
            firstTokenID,
            secondTokenID,
            firstTokenNonce,
            secondTokenNonce,
        );
    }

    @Query(returns => TransactionModel)
    async removeLiquidityProxy(
        @Args('sender') sender: string,
        @Args('pairAddress') pairAddress: string,
        @Args('wrappedLpTokenID') wrappedLpTokenID: string,
        @Args('wrappedLpTokenNonce', { type: () => Int })
        wrappedLpTokenNonce: number,
        @Args('liquidity') liqidity: string,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.proxyService.removeLiquidityProxy(
            sender,
            pairAddress,
            wrappedLpTokenID,
            wrappedLpTokenNonce,
            liqidity,
            tolerance,
        );
    }

    @Query(returns => TransactionModel)
    async enterFarmProxy(
        @Args('sender') sender: string,
        @Args('farmAddress') farmAddress: string,
        @Args('acceptedLockedTokenID') acceptedLockedTokenID: string,
        @Args('acceptedLockedTokenNonce', { type: () => Int })
        acceptedLockedTokenNonce: number,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.proxyService.enterFarmProxy(
            sender,
            farmAddress,
            acceptedLockedTokenID,
            acceptedLockedTokenNonce,
            amount,
        );
    }

    @Query(returns => TransactionModel)
    async exitFarmProxy(
        @Args('sender') sender: string,
        @Args('farmAddress') farmAddress: string,
        @Args('wrappedFarmTokenID') wrappedFarmTokenID: string,
        @Args('wrappedFarmTokenNonce', { type: () => Int })
        wrappedFarmTokenNonce: number,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.proxyService.exitFarmProxy(
            sender,
            farmAddress,
            wrappedFarmTokenID,
            wrappedFarmTokenNonce,
            amount,
        );
    }

    @Query(returns => TransactionModel)
    async claimFarmRewardsProxy(
        @Args('sender') sender: string,
        @Args('farmAddress') farmAddress: string,
        @Args('wrappedFarmTokenID') wrappedFarmTokenID: string,
        @Args('wrappedFarmTokenNonce', { type: () => Int })
        wrappedFarmTokenNonce: number,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.proxyService.claimFarmRewardsProxy(
            sender,
            farmAddress,
            wrappedFarmTokenID,
            wrappedFarmTokenNonce,
            amount,
        );
    }
}
