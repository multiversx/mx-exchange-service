import { Resolver, Query, ResolveField } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import {
    CommunityDistributionModel,
    DistributionModel,
} from './models/distribution.model';
import { DistributionTransactionsService } from './services/distribution.transactions.service';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { DistributionAbiService } from './services/distribution.abi.service';
import { scAddress } from 'src/config';

@Resolver(() => DistributionModel)
export class DistributionResolver {
    constructor(
        private readonly distributionAbi: DistributionAbiService,
        private readonly transactionsService: DistributionTransactionsService,
    ) {}

    @ResolveField()
    async communityDistribution(): Promise<CommunityDistributionModel> {
        return this.distributionAbi.communityDistribution();
    }

    @Query(() => DistributionModel)
    async distribution(): Promise<DistributionModel> {
        return new DistributionModel({
            address: scAddress.distributionAddress,
        });
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimLockedAssets(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionsService.claimLockedAssets(user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => String)
    async distributedLockedAssets(
        @AuthUser() user: UserAuthResult,
    ): Promise<string> {
        const assets = await this.distributionAbi.distributedLockedAssets(
            user.address,
        );
        return assets.toFixed();
    }
}
