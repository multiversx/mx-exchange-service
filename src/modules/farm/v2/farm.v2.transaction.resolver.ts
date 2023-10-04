import { Args, Query, Resolver } from '@nestjs/graphql';
import { FarmTransactionServiceV2 } from './services/farm.v2.transaction.service';
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from 'src/modules/auth/jwt.or.native.auth.guard';
import { TransactionModel } from 'src/models/transaction.model';
import { AuthUser } from 'src/modules/auth/auth.user';
import { UserAuthResult } from 'src/modules/auth/user.auth.result';

@Resolver()
export class FarmTransactionResolverV2 {
    constructor(private readonly farmTransaction: FarmTransactionServiceV2) {}

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async migrateTotalFarmPositions(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        return this.farmTransaction.migrateTotalFarmPosition(
            farmAddress,
            user.address,
        );
    }
}
