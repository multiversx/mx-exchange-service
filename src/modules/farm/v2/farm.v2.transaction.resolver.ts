import { Args, Query, Resolver } from '@nestjs/graphql';
import { FarmTransactionServiceV2 } from './services/farm.v2.transaction.service';
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from 'src/modules/auth/jwt.or.native.auth.guard';
import { TransactionModel } from 'src/models/transaction.model';
import { AuthUser } from 'src/modules/auth/auth.user';
import { UserAuthResult } from 'src/modules/auth/user.auth.result';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from '../models/farm.model';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver()
export class FarmTransactionResolverV2 {
    constructor(private readonly farmTransaction: FarmTransactionServiceV2) {}

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel], {
        description:
            'Generate transactions to initialize the total farm positions for a user',
    })
    async migrateTotalFarmPositions(
        @Args('farmsAddresses', { type: () => [String] })
        farmsAddresses: string[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        for (const farmAddress of farmsAddresses) {
            if (farmVersion(farmAddress) !== FarmVersion.V2) {
                throw new GraphQLError('Farm version is not supported', {
                    extensions: {
                        code: ApolloServerErrorCode.BAD_USER_INPUT,
                    },
                });
            }
        }
        const promises = farmsAddresses.map((farmAddress) =>
            this.farmTransaction.migrateTotalFarmPosition(
                farmAddress,
                user.address,
            ),
        );
        return (await Promise.all(promises)).flat();
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel, {
        description: 'Generate transaction to claim only boosted rewards',
    })
    async claimFarmBoostedRewards(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.farmTransaction.claimBoostedRewards(
            user.address,
            farmAddress,
        );
    }
}
