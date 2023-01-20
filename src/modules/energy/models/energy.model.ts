import { EnergyType } from '@multiversx/sdk-exchange';
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum UnlockType {
    TERM_UNLOCK,
    EARLY_UNLOCK,
    REDUCE_PERIOD,
}

registerEnumType(UnlockType, {
    name: 'UnlockType',
});

@ObjectType()
export class EnergyModel {
    @Field()
    amount: string;
    @Field(() => Int)
    lastUpdateEpoch: number;
    @Field()
    totalLockedTokens: string;

    constructor(init?: Partial<EnergyType>) {
        Object.assign(this, init);
    }
}
