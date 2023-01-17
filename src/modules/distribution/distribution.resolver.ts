import { Resolver, Query, ResolveField } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { DistributionService } from './services/distribution.service';
import {
    CommunityDistributionModel,
    DistributionModel,
} from './models/distribution.model';
import { TransactionsDistributionService } from './services/transaction-distribution.service';
import { ApolloError } from 'apollo-server-express';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { DistributionGetterService } from './services/distribution.getter.service';

@Resolver(() => DistributionModel)
export class DistributionResolver {
    constructor(
        private readonly distributionService: DistributionService,
        private readonly distributionGetter: DistributionGetterService,
        private readonly transactionsService: TransactionsDistributionService,
    ) {}

    @ResolveField()
    async communityDistribution(): Promise<CommunityDistributionModel> {
        try {
            return await this.distributionGetter.getCommunityDistribution();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => DistributionModel)
    async distribution(): Promise<DistributionModel> {
        try {
            return await this.distributionService.getDistributionInfo();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimLockedAssets(): Promise<TransactionModel> {
        try {
            return await this.transactionsService.claimLockedAssets();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => String)
    async distributedLockedAssets(
        @AuthUser() user: UserAuthResult,
    ): Promise<string> {
        try {
            return await this.distributionService.getDistributedLockedAssets(
                user.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
