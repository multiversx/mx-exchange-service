import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtTokenPaymentModel } from 'src/modules/tokens/models/esdt.token.payment.model';

@ObjectType()
export class TokenUnstakeModel {
    @Field()
    address: string;
    @Field(() => Int)
    unbondEpochs: number;
    @Field(() => Int)
    feesBurnPercentage: number;
    @Field()
    feesCollectorAddress: string;
    @Field()
    energyFactoryAddress: string;

    constructor(init?: Partial<TokenUnstakeModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UnstakePairModel {
    @Field()
    unlockEpoch: number;
    @Field(() => EsdtTokenPaymentModel)
    lockedTokens: EsdtTokenPaymentModel;
    @Field(() => EsdtTokenPaymentModel)
    unlockedTokens: EsdtTokenPaymentModel;

    constructor(init?: Partial<UnstakePairModel>) {
        Object.assign(this, init);
    }
}
