import { UseGuards } from '@nestjs/common';
import { Query, ResolveField, Resolver } from '@nestjs/graphql';
import { TransactionModel } from 'src/models/transaction.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { TokenUnstakeModel } from './models/token.unstake.model';
import { TokenUnstakeGetterService } from './services/token.unstake.getter.service';
import { TokenUnstakeTransactionService } from './services/token.unstake.transaction.service';

@Resolver(() => TokenUnstakeModel)
export class TokenUnstakeResolver extends GenericResolver {
    constructor(
        private readonly tokenUnstakeGetter: TokenUnstakeGetterService,
        private readonly tokenUnstakeTransactions: TokenUnstakeTransactionService,
    ) {
        super();
    }

    @ResolveField()
    async unbondEpochs(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeGetter.getUnbondEpochs(),
        );
    }

    @ResolveField()
    async feesBurnPercentage(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeGetter.getFeesBurnPercentage(),
        );
    }

    @ResolveField()
    async feesCollectorAddress(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeGetter.getFeesCollectorAddress(),
        );
    }

    @ResolveField()
    async lastEpochFeeSentToCollector(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeGetter.getLastEpochFeeSentToCollector(),
        );
    }

    @ResolveField()
    async energyFactoryAddress(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeGetter.getEnergyFactoryAddress(),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimUnlockedTokens(): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.tokenUnstakeTransactions.claimUnlockedTokens(),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async cancelUnbond(): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.tokenUnstakeTransactions.cancelUnbond(),
        );
    }
}
