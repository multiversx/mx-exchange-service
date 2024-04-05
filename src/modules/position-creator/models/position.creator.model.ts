import { Field, ObjectType } from '@nestjs/graphql';
import { TransactionModel } from 'src/models/transaction.model';
import { SwapRouteModel } from 'src/modules/auto-router/models/auto-route.model';

@ObjectType()
export class PositionCreatorModel {
    @Field()
    address: string;

    constructor(init: Partial<PositionCreatorModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PositionCreatorTransactionModel {
    @Field(() => [SwapRouteModel])
    swaps: SwapRouteModel[];

    @Field(() => [TransactionModel], { nullable: true })
    transactions: TransactionModel[];
}
