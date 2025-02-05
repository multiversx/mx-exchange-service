import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

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
    inputToken: EsdtToken;
    @Field()
    outputToken: EsdtToken;

    constructor(init?: Partial<TradingActivityModel>) {
        Object.assign(this, init);
    }
}
