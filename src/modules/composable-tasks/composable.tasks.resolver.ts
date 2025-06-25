import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { ComposableTaskModel } from './models/composable.tasks.model';
import { scAddress } from 'src/config';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from 'src/models/transaction.model';
import { ComposableTasksTransactionService } from './services/composable.tasks.transaction';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';

@Resolver()
export class ComposableTasksResolver {
    constructor(
        private readonly transactionService: ComposableTasksTransactionService,
    ) {}
    @Query(() => ComposableTaskModel)
    async composableTask(): Promise<ComposableTaskModel> {
        return new ComposableTaskModel({
            address: scAddress.composableTasks,
        });
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setSmartSwapFeePercentage(
        @Args('fee', { type: () => Int }) fee: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionService.setSmartSwapFeePercentage(
            user.address,
            fee,
        );
    }
}
