import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EsdtTokenPaymentModel } from 'src/modules/tokens/models/esdt.token.payment.model';

export enum TradingActivityAction {
    'BUY' = 'BUY',
    'SELL' = 'SELL',
}

registerEnumType(TradingActivityAction, { name: 'TradingActivityAction' });

@ObjectType()
export class TradingActivityModel {
    @Field()
    hash: string;
    @Field()
    timestamp: string;
    @Field()
    action: TradingActivityAction;
    @Field()
    inputToken: EsdtTokenPaymentModel;
    @Field()
    outputToken: EsdtTokenPaymentModel;

    constructor(init?: Partial<TradingActivityModel>) {
        Object.assign(this, init);
    }
}
