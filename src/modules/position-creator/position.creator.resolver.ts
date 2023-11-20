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
}
