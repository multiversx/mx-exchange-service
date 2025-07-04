import { Args, Int, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ComposableTaskModel } from './models/composable.tasks.model';
import { scAddress } from 'src/config';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from 'src/models/transaction.model';
import { ComposableTasksTransactionService } from './services/composable.tasks.transaction';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { ComposableTasksAbiService } from './services/composable.tasks.abi.service';

@Resolver(() => ComposableTaskModel)
export class ComposableTasksResolver {
    constructor(
        private readonly transactionService: ComposableTasksTransactionService,
        private readonly abiService: ComposableTasksAbiService,
    ) {}
    @Query(() => ComposableTaskModel)
    async composableTask(): Promise<ComposableTaskModel> {
        return new ComposableTaskModel({
            address: scAddress.composableTasks,
        });
    }

    @ResolveField()
    async smartSwapFeePercentage(): Promise<number> {
        return this.abiService.smartSwapFeePercentage();
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
