import { Resolver, Query, ResolveField } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { DistributionService } from './distribution.service';
import {
    CommunityDistributionModel,
    DistributionModel,
} from './models/distribution.model';
import { TransactionsDistributionService } from './transaction-distribution.service';
import { ApolloError } from 'apollo-server-express';
import { User } from 'src/helpers/userDecorator';
import { GqlAuthGuard } from '../auth/gql.auth.guard';

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

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async claimLockedAssets(): Promise<TransactionModel> {
        return await this.transactionsService.claimLockedAssets();
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => String)
    async distributedLockedAssets(@User() user: any): Promise<string> {
        return await this.distributionService.getDistributedLockedAssets(
            user.publicKey,
        );
    }
}
