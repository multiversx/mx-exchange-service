import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { DistributionService } from './distribution.service';
import {
    CommunityDistributionModel,
    DistributionModel,
} from './models/distribution.model';
import { TransactionsDistributionService } from './transaction-distribution.service';
import { JwtAuthenticateGuard } from '../../helpers/guards/jwt.authenticate.guard';
import { ApolloError } from 'apollo-server-express';

@Resolver(of => DistributionModel)
export class DistributionResolver {
    constructor(
        @Inject(DistributionService)
        private distributionService: DistributionService,
        @Inject(TransactionsDistributionService)
        private transactionsService: TransactionsDistributionService,
    ) {}

    @ResolveField()
    async communityDistribution(): Promise<CommunityDistributionModel> {
        try {
            return await this.distributionService.getCommunityDistribution();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(returns => DistributionModel)
    async distribution(): Promise<DistributionModel> {
        try {
            return await this.distributionService.getDistributionInfo();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async claimLockedAssets(): Promise<TransactionModel> {
        return await this.transactionsService.claimLockedAssets();
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => String)
    async distributedLockedAssets(
        @Args('userAddress') userAddress: string,
    ): Promise<string> {
        return await this.distributionService.getDistributedLockedAssets(
            userAddress,
        );
    }
}
