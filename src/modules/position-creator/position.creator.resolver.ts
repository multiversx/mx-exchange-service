import { Args, Query, Resolver } from '@nestjs/graphql';
import { PositionCreatorModel } from './models/position.creator.model';
import { scAddress } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { PositionCreatorTransactionService } from './services/position.creator.transaction';
import { InputTokenModel } from 'src/models/inputToken.model';

@Resolver(PositionCreatorModel)
export class PositionCreatorResolver {
    constructor(
        private readonly posCreatorTransaction: PositionCreatorTransactionService,
    ) {}

    @Query(() => PositionCreatorModel)
    async getPositionCreator(): Promise<PositionCreatorModel> {
        return new PositionCreatorModel({
            address: scAddress.positionCreator,
        });
    }

    @Query(() => TransactionModel)
    async createPositionSingleToken(
        @Args('pairAddress') pairAddress: string,
        @Args('payment') payment: InputTokenModel,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.posCreatorTransaction.createLiquidityPositionSingleToken(
            pairAddress,
            new EsdtTokenPayment({
                tokenIdentifier: payment.tokenID,
                tokenNonce: payment.nonce,
                amount: payment.amount,
            }),
            tolerance,
        );
    }

    @Query(() => TransactionModel)
    async createFarmPositionSingleToken(
        @Args('farmAddress') farmAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.posCreatorTransaction.createFarmPositionSingleToken(
            farmAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
        );
    }

    @Query(() => TransactionModel)
    async createDualFarmPositionSingleToken(
        @Args('dualFarmAddress') dualFarmAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.posCreatorTransaction.createDualFarmPositionSingleToken(
            dualFarmAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
        );
    }

    @Query(() => TransactionModel)
    async createStakingPositionSingleToken(
        @Args('stakingAddress') stakingAddress: string,
        @Args('payment') payment: InputTokenModel,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.posCreatorTransaction.createStakingPositionSingleToken(
            stakingAddress,
            new EsdtTokenPayment({
                tokenIdentifier: payment.tokenID,
                tokenNonce: payment.nonce,
                amount: payment.amount,
            }),
            tolerance,
        );
    }

    @Query(() => TransactionModel)
    async createFarmPositionDualTokens(
        @Args('farmAddress') farmAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.posCreatorTransaction.createFarmPositionDualTokens(
            farmAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
        );
    }

}
