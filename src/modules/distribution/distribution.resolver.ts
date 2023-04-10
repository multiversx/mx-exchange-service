import { Resolver, Query, ResolveField } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { DistributionService } from './services/distribution.service';
import {
    CommunityDistributionModel,
    DistributionModel,
} from './models/distribution.model';
import { DistributionTransactionsService } from './services/distribution.transactions.service';
import { ApolloError } from 'apollo-server-express';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { DistributionAbiService } from './services/distribution.abi.service';
import { scAddress } from 'src/config';

@Resolver(() => DistributionModel)
export class DistributionResolver {
    constructor(
        private readonly distributionService: DistributionService,
        private readonly distributionAbi: DistributionAbiService,
        private readonly transactionsService: DistributionTransactionsService,
    ) {}

    @ResolveField()
    async communityDistribution(): Promise<CommunityDistributionModel> {
        try {
            return await this.distributionAbi.communityDistribution();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => DistributionModel)
    async distribution(): Promise<DistributionModel> {
        try {
            return new DistributionModel({
                address: scAddress.distributionAddress,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimLockedAssets(): Promise<TransactionModel> {
        try {
            return await this.transactionsService.claimLockedAssets();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => String)
    async distributedLockedAssets(
        @AuthUser() user: UserAuthResult,
    ): Promise<string> {
        try {
            const assets = await this.distributionAbi.distributedLockedAssets(
                user.address,
            );
            return assets.toFixed();
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
