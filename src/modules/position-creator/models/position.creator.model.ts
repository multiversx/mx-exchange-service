import { Field, ObjectType } from '@nestjs/graphql';
import { TransactionModel } from 'src/models/transaction.model';
import { SwapRouteModel } from 'src/modules/auto-router/models/auto-route.model';
import { EsdtTokenPaymentModel } from 'src/modules/tokens/models/esdt.token.payment.model';

@ObjectType()
export class PositionCreatorModel {
    @Field()
    address: string;

    constructor(init: Partial<PositionCreatorModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class LiquidityPositionSingleTokenModel {
    @Field(() => EsdtTokenPaymentModel)
    payment: EsdtTokenPaymentModel;

    @Field(() => [SwapRouteModel])
    swaps: SwapRouteModel[];

    @Field(() => [TransactionModel], { nullable: true })
    transactions?: TransactionModel[];

    constructor(init: Partial<LiquidityPositionSingleTokenModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmPositionSingleTokenModel {
    @Field(() => EsdtTokenPaymentModel)
    payment: EsdtTokenPaymentModel;

    @Field(() => [SwapRouteModel])
    swaps: SwapRouteModel[];

    @Field(() => [TransactionModel], { nullable: true })
    transactions?: TransactionModel[];

    constructor(init: Partial<FarmPositionSingleTokenModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DualFarmPositionSingleTokenModel {
    @Field(() => EsdtTokenPaymentModel)
    payment: EsdtTokenPaymentModel;

    @Field(() => [SwapRouteModel])
    swaps: SwapRouteModel[];

    @Field(() => [TransactionModel], { nullable: true })
    transactions?: TransactionModel[];

    constructor(init: Partial<DualFarmPositionSingleTokenModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class StakingPositionSingleTokenModel {
    @Field(() => EsdtTokenPaymentModel)
    payment: EsdtTokenPaymentModel;

    @Field(() => [SwapRouteModel])
    swaps: SwapRouteModel[];

    @Field(() => [TransactionModel], { nullable: true })
    transactions?: TransactionModel[];

    constructor(init: Partial<StakingPositionSingleTokenModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class EnergyPositionSingleTokenModel {
    @Field(() => EsdtTokenPaymentModel)
    payment: EsdtTokenPaymentModel;

    @Field(() => [SwapRouteModel])
    swaps: SwapRouteModel[];

    @Field(() => [TransactionModel], { nullable: true })
    transactions?: TransactionModel[];

    constructor(init: Partial<EnergyPositionSingleTokenModel>) {
        Object.assign(this, init);
    }
}
